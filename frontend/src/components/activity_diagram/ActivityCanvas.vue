<template>
  <div class="activity-canvas">
    <div class="header">
      <input v-model="local.name" placeholder="Tên sơ đồ" />
      <input v-model="local.description" placeholder="Mô tả" />
      <button @click="emitUpdate">Lưu</button>
      <button @click="downloadPng">Tải PNG</button>
    </div>
    <div class="editor">
      <div class="nodes">
        <h4>Nút</h4>
        <div class="row" v-for="n in local.nodes" :key="n.id">
          <input v-model="n.id" placeholder="id" />
          <select v-model="n.type">
            <option value="start">start</option>
            <option value="action">action</option>
            <option value="decision">decision</option>
            <option value="merge">merge</option>
            <option value="end">end</option>
          </select>
          <input v-model="n.label" placeholder="label" />
          <button @click="removeNode(n.id)">X</button>
        </div>
        <button @click="addNode">+ Thêm nút</button>
      </div>
      <div class="edges">
        <h4>Cạnh</h4>
        <div class="row" v-for="(e, idx) in local.edges" :key="idx">
          <input v-model="e.from" placeholder="from" />
          <input v-model="e.to" placeholder="to" />
          <input v-model="e.condition" placeholder="điều kiện" />
          <button @click="removeEdge(idx)">X</button>
        </div>
        <button @click="addEdge">+ Thêm cạnh</button>
      </div>
    </div>
    <div class="svg">
      <textarea v-model="local.diagram_svg" rows="6" placeholder="SVG (tuỳ chọn)"></textarea>
    </div>
  </div>
  
</template>

<script>
export default {
  name: 'ActivityCanvas',
  props: { diagram: Object },
  data() {
    return { local: JSON.parse(JSON.stringify(this.diagram || { nodes: [], edges: [] })) }
  },
  watch: {
    diagram: {
      deep: true,
      handler(v) {
        this.local = JSON.parse(JSON.stringify(v || { nodes: [], edges: [] }))
      }
    }
  },
  methods: {
    addNode() {
      this.local.nodes = this.local.nodes || []
      this.local.nodes.push({ id: `n_${Date.now()}`, type: 'action', label: '' })
    },
    removeNode(id) {
      this.local.nodes = (this.local.nodes || []).filter(n => n.id !== id)
    },
    addEdge() {
      this.local.edges = this.local.edges || []
      this.local.edges.push({ from: '', to: '', condition: '' })
    },
    removeEdge(idx) {
      this.local.edges.splice(idx, 1)
    },
    emitUpdate() {
      this.$emit('update', this.local)
    },
    downloadPng() {
      if (!this.local.diagram_svg) return
      const svg = new Blob([this.local.diagram_svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svg)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `${this.local.name || 'activity-diagram'}.png`
          a.click()
          URL.revokeObjectURL(a.href)
          URL.revokeObjectURL(url)
        }, 'image/png')
      }
      img.src = url
    }
  }
}

</script>

<style scoped>
.activity-canvas { display: flex; flex-direction: column; gap: 8px; }
.header { display: flex; gap: 8px; }
.editor { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 6px; align-items: center; }
textarea { width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>


