<template>
  <div class="page activity-diagram-management">
    <ProjectHeader :project="project" />

    <div class="page-header card">
      <div class="header-left">
        <h2>Activity Diagram</h2>
        <p class="subtitle">Generate and edit activity diagrams from requirement models</p>
      </div>
      <div class="header-actions">
        <div class="toolbar">
          <select class="control" v-model="selectedActor" @change="onActorChange" :disabled="!selectedVersionId">
            <option :value="''">Chọn Actor</option>
            <option v-for="a in actors" :key="a" :value="a">{{ a }}</option>
          </select>
          <select class="control" v-model="selectedRequirementId" :disabled="!selectedActor">
            <option :value="''">Chọn Usecase (Requirement) - tùy chọn</option>
            <option v-for="r in filteredRequirements" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
          <select class="control" v-model="language">
            <option value="vi-VN">Tiếng Việt</option>
            <option value="en-US">English</option>
          </select>
          <button class="btn btn-primary" @click="handleGenerate">Tạo sơ đồ</button>
          <button class="btn btn-outline" :disabled="!selectedDiagram" @click="handleValidate">Validate</button>
          <button class="btn btn-outline" :disabled="!selectedDiagram" @click="handleExportSvg">Export SVG</button>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="left card">
        <div class="panel-header">
          <h3>Danh sách Activity Diagrams</h3>
          <button class="btn btn-secondary" @click="createEmpty">+ Tạo mới</button>
        </div>
        <div class="list">
          <div v-if="!diagrams || diagrams.length === 0" class="empty">
            Chưa có activity diagram nào. Hãy tạo mới hoặc sinh từ requirement.
          </div>
          <ul v-else>
            <li v-for="d in diagrams" :key="d._id" @click="selectDiagram(d)" :class="{ active: selectedDiagram && d._id === selectedDiagram._id }">
              <div class="item-title">{{ d.name }}</div>
              <div class="item-subtitle">{{ d.description }}</div>
            </li>
          </ul>
        </div>
        <div class="panel-actions">
          <button class="btn btn-danger" :disabled="!selectedDiagram" @click="removeSelected">Xoá</button>
        </div>
      </div>
      <div class="right card">
        <div class="panel-header">
          <h3>Trình chỉnh sửa</h3>
        </div>
        <div class="editor">
          <ActivityCanvas
            v-if="selectedDiagram"
            :diagram="selectedDiagram"
            @update="saveDiagram"
          />
          <div v-else class="placeholder">Chọn hoặc tạo sơ đồ để chỉnh sửa.</div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script>
import ProjectHeader from '@/components/ProjectHeader.vue'
import ActivityCanvas from '@/components/activity_diagram/ActivityCanvas.vue'
import { listActivityDiagrams, generateFromActor, generateFromUsecase, createActivityDiagram, updateActivityDiagram, deleteActivityDiagram, validateActivityDiagram, exportActivityDiagramSvg } from '@/api/activity_diagram'
import { getProjectDetail } from '@/api/project'
import axios from 'axios'

export default {
  name: 'ActivityDiagramManagement',
  components: { ProjectHeader, ActivityCanvas },
  props: { id: String },
  data() {
    return {
      project: {},
      versions: [],
      selectedVersionId: null,
      actors: [],
      requirements: [],
      selectedActor: '',
      selectedRequirementId: '',
      language: 'vi-VN',
      diagrams: [],
      selectedDiagram: null,
    }
  },
  async created() {
    const projectId = this.$route.params.id
    if (!projectId) return
    // Ưu tiên dùng cache local để tránh gọi backend khi offline
    const cached = localStorage.getItem('lastProjectDetail')
    if (cached) {
      try {
        const result = JSON.parse(cached)
        if (result?.project && Array.isArray(result?.versions)) {
          this.project = result.project
          this.versions = result.versions
          if (this.versions.length > 0) this.selectedVersionId = this.versions[0]._id
        }
      } catch {}
    } else {
      await this.fetchProject(projectId)
    }
    if (this.selectedVersionId) this.loadActorsAndRequirementsFromVersion()
    // Tránh gọi API khi backend không sẵn sàng; chỉ tải khi người dùng thao tác
  },
  watch: {
    selectedVersionId() {
      this.loadActorsAndRequirementsFromVersion()
    }
  },
  computed: {
    filteredRequirements() {
      if (!this.selectedActor) return []
      return (this.requirements || []).filter(r => (r.role || '').toLowerCase() === this.selectedActor.toLowerCase())
    }
  },
  methods: {
    async fetchProject(projectId) {
      const userId = localStorage.getItem('userId')
      const { data } = await getProjectDetail(projectId, userId)
      const result = data.data || data
      this.project = result.project || {}
      this.versions = result.versions || []
      if (this.versions.length > 0) {
        this.selectedVersionId = this.versions[0]._id
      }
      // Cache lại để dùng khi offline
      localStorage.setItem('lastProjectDetail', JSON.stringify({ project: this.project, versions: this.versions }))
    },
    loadActorsAndRequirementsFromVersion() {
      const v = (this.versions || []).find(v => v._id === this.selectedVersionId)
      const reqs = Array.isArray(v?.requirement_model) ? v.requirement_model : []
      this.requirements = reqs
      const actorSet = new Set()
      reqs.forEach(r => { if (r?.role) actorSet.add(r.role) })
      this.actors = Array.from(actorSet)
    },
    onActorChange() {
      this.selectedRequirementId = ''
    },
    async reloadDiagrams(params) {
      try {
        const res = await listActivityDiagrams(params)
        this.diagrams = res.data?.data || []
        if (this.selectedDiagram) {
          const found = this.diagrams.find(d => d._id === this.selectedDiagram._id)
          this.selectedDiagram = found || null
        }
      } catch (e) {
        // Bỏ qua lỗi mạng để không làm vỡ giao diện khi backend chưa chạy
        this.diagrams = this.diagrams || []
      }
    },
    selectDiagram(d) {
      this.selectedDiagram = JSON.parse(JSON.stringify(d))
    },
    async handleGenerate() {
      if (!this.selectedVersionId || !this.selectedActor) return
      if (this.selectedRequirementId) {
        await generateFromUsecase(this.selectedRequirementId, this.selectedVersionId, this.language, this.selectedActor)
      } else {
        await generateFromActor(this.selectedVersionId, this.selectedActor, this.language)
      }
      await this.reloadDiagrams({ projectId: this.project._id })
    },  
    async createEmpty() {
      if (!this.selectedVersionId) return
      const resUmls = await axios.get('/api/umls', { params: { projectId: this.project._id } })
      const uml = (resUmls.data?.data || []).find(u => u.version_id === this.selectedVersionId) || (resUmls.data?.data || [])[0]
      if (!uml) return
      const res = await createActivityDiagram({ uml_id: uml._id, name: 'New Activity Diagram', nodes: [], edges: [] })
      const created = res.data?.data
      await this.reloadDiagrams({ projectId: this.project._id })
      this.selectedDiagram = created
    },
    async saveDiagram(diagram) {
      await updateActivityDiagram(diagram._id, {
        name: diagram.name,
        description: diagram.description,
        nodes: diagram.nodes,
        edges: diagram.edges,
        diagram_svg: diagram.diagram_svg,
        linked_usecase: diagram.linked_usecase,
      })
      await this.reloadDiagrams({ projectId: this.project._id })
    },
    async removeSelected() {
      if (!this.selectedDiagram) return
      await deleteActivityDiagram(this.selectedDiagram._id)
      this.selectedDiagram = null
      await this.reloadDiagrams({ projectId: this.project._id })
    },
    async handleValidate() {
      if (!this.selectedDiagram) return
      const res = await validateActivityDiagram(this.selectedDiagram._id)
      const { valid, errors } = res.data?.data || { valid: false, errors: [] }
      if (!valid) alert(`Lỗi cấu trúc:\n- ${errors.join('\n- ')}`)
      else alert('Cấu trúc hợp lệ!')
    },
    async handleExportSvg() {
      if (!this.selectedDiagram) return
      const res = await exportActivityDiagramSvg(this.selectedDiagram._id)
      const svg = res.data
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.selectedDiagram.name || 'activity-diagram'}.svg`
      a.click()
      URL.revokeObjectURL(url)
    },
  }
}

</script>

<style scoped>
.page { padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f9fafb; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.page-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; }
.header-left h2 { margin: 0; font-size: 20px; color: #1f2937; }
.subtitle { margin: 4px 0 0 0; color: #6b7280; font-size: 13px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.toolbar { display: flex; align-items: center; gap: 8px; }
.control { height: 36px; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #111; }
.btn { height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-weight: 500; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-primary { background: #1a365d; color: #fff; border-color: #1a365d; }
.btn-secondary { background: #f3f4f6; color: #111827; border-color: #e5e7eb; }
.btn-outline { background: #fff; color: #1f2937; border-color: #e5e7eb; }
.btn-danger { background: #ef4444; color: #fff; border-color: #ef4444; }
.content { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
.left { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; }
.list { min-height: 260px; }
.empty { color: #6b7280; font-size: 13px; padding: 12px; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 8px; }
.left ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.left li { padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; }
.left li:hover { background: #f9fafb; }
.left li.active { background: #eef2ff; border-color: #c7d2fe; }
.item-title { font-weight: 600; color: #111827; }
.item-subtitle { color: #6b7280; font-size: 12px; }
.panel-actions { display: flex; gap: 8px; justify-content: flex-end; }
.right { padding: 12px; }
.editor { min-height: 480px; border: 1px dashed #e5e7eb; border-radius: 8px; padding: 8px; background: #fff; }
.placeholder { display: flex; align-items: center; justify-content: center; color: #6b7280; height: 100%; }
</style>


