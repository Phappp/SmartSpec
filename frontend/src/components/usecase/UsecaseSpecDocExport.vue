<template>
  <div class="export-modal-overlay" v-if="showExportModal" @click="closeExportModal">
    <div class="export-modal-content" @click.stop>
      <div class="export-modal-header">
        <h3>Export Use Case Specification</h3>
        <button class="btn-close" @click="closeExportModal">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="export-modal-body">
        <!-- Format Selection -->
        <div class="export-section">
          <h4>Export Format</h4>
          <div class="format-options">
            <label class="format-option" :class="{ active: selectedFormat === 'docx' }">
              <input type="radio" v-model="selectedFormat" value="docx" class="format-radio" />
              <div class="format-icon">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div class="format-info">
                <strong>Microsoft Word (.docx)</strong>
                <span>Editable document format</span>
              </div>
            </label>

            <label class="format-option" :class="{ active: selectedFormat === 'pdf' }">
              <input type="radio" v-model="selectedFormat" value="pdf" class="format-radio" />
              <div class="format-icon">
                <span class="material-symbols-outlined">picture_as_pdf</span>
              </div>
              <div class="format-info">
                <strong>PDF Document (.pdf)</strong>
                <span>Portable document format</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Scope Selection -->
        <div class="export-section">
          <h4>Export Scope</h4>
          <div class="scope-options">
            <label class="scope-option">
              <input type="radio" v-model="exportScope" value="all" class="scope-radio" />
              <span>All Use Cases</span>
            </label>

            <label class="scope-option">
              <input
                type="radio"
                v-model="exportScope"
                value="selected"
                class="scope-radio"
                :disabled="selectedUseCases.length === 0"
              />
              <span>
                Selected Use Cases ({{ selectedUseCases.length }})
                <span v-if="selectedUseCases.length === 0" class="hint"
                  >- No use cases selected</span
                >
              </span>
            </label>

            <label class="scope-option">
              <input type="radio" v-model="exportScope" value="role" class="scope-radio" />
              <span>By Role</span>
            </label>
          </div>

          <!-- Role Selection (when scope is by role) -->
          <div v-if="exportScope === 'role'" class="role-selection">
            <select v-model="selectedRole" class="role-select">
              <option value="">Select a role</option>
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }} ({{ roleUseCaseCounts[role] || 0 }} use cases)
              </option>
            </select>
          </div>
        </div>

        <!-- Document Options -->
        <div class="export-section">
          <h4>Document Options</h4>
          <div class="document-options-grid">
            <label class="option-checkbox">
              <input type="checkbox" v-model="includeTableOfContents" />
              <span>Include Table of Contents</span>
            </label>

            <label class="option-checkbox">
              <input type="checkbox" v-model="includePageNumbers" />
              <span>Include Page Numbers</span>
            </label>

            <label class="option-checkbox">
              <input type="checkbox" v-model="includeTimestamp" />
              <span>Include Generation Timestamp</span>
            </label>

            <label class="option-checkbox">
              <input type="checkbox" v-model="includeProjectInfo" />
              <span>Include Project Information</span>
            </label>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="export-section">
          <h4>Preview</h4>
          <div class="preview-info">
            <p><strong>Total use cases to export:</strong> {{ useCasesToExport.length }}</p>
            <p><strong>Format:</strong> {{ selectedFormat.toUpperCase() }}</p>
            <p><strong>Estimated pages:</strong> {{ estimatedPages }}</p>
          </div>
        </div>
      </div>

      <div class="export-modal-actions">
        <button class="btn-secondary" @click="closeExportModal" :disabled="exporting">
          Cancel
        </button>
        <button
          class="btn-primary"
          @click="startExport"
          :disabled="exporting || useCasesToExport.length === 0"
        >
          <span v-if="exporting" class="button-spinner"></span>
          <span class="material-symbols-outlined" v-else>
            {{ selectedFormat === 'pdf' ? 'picture_as_pdf' : 'description' }}
          </span>
          {{ exporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { useToast } from 'vue-toastification'

export default {
  name: 'UsecaseSpecDocExport',
  props: {
    showExportModal: {
      type: Boolean,
      default: false,
    },
    useCases: {
      type: Array,
      default: () => [],
    },
    selectedUseCases: {
      type: Array,
      default: () => [],
    },
    projectInfo: {
      type: Object,
      default: () => ({}),
    },
  },
  data() {
    return {
      selectedFormat: 'docx',
      exportScope: 'all',
      selectedRole: '',

      // Document options
      includeTableOfContents: true,
      includePageNumbers: true,
      includeTimestamp: true,
      includeProjectInfo: true,

      exporting: false,
    }
  },
  computed: {
    availableRoles() {
      const roles = new Set()
      this.useCases.forEach((uc) => {
        const actorName = uc.actor?.name || uc.role?.name
        if (actorName) roles.add(actorName)
      })
      return Array.from(roles).sort()
    },

    roleUseCaseCounts() {
      const counts = {}
      this.useCases.forEach((uc) => {
        const actorName = uc.actor?.name || uc.role?.name
        if (actorName) {
          counts[actorName] = (counts[actorName] || 0) + 1
        }
      })
      return counts
    },

    useCasesToExport() {
      switch (this.exportScope) {
        case 'selected':
          return this.selectedUseCases
        case 'role':
          return this.selectedRole
            ? this.useCases.filter((uc) => {
                const actorName = uc.actor?.name || uc.role?.name
                return actorName === this.selectedRole
              })
            : []
        case 'all':
        default:
          return this.useCases
      }
    },

    estimatedPages() {
      // Estimate ~1 page per use case for detailed specification
      const basePages = Math.max(1, this.useCasesToExport.length)
      return this.includeTableOfContents ? basePages + 1 : basePages
    },
  },
  methods: {
    // Helper: Get usecase ID (support both _id and id for backward compatibility)
    getUsecaseId(uc) {
      if (!uc) return ''
      return String(uc._id || uc.id || '')
    },
    closeExportModal() {
      if (!this.exporting) {
        this.$emit('close')
      }
    },

    async startExport() {
      if (this.useCasesToExport.length === 0) {
        this.toast.error('No use cases selected for export')
        return
      }

      this.exporting = true

      try {
        if (this.selectedFormat === 'docx') {
          await this.exportAsDocx()
        } else {
          await this.exportAsPdf()
        }

        this.toast.success(
          `Use case specification exported successfully as ${this.selectedFormat.toUpperCase()}`
        )
        this.closeExportModal()
      } catch (error) {
        console.error('Export error:', error)
        this.toast.error(`Failed to export document: ${error.message}`)
      } finally {
        this.exporting = false
      }
    },

    async exportAsDocx() {
      // Create a simple DOCX using plain text format
      const content = this.generateDocumentContent()
      const blob = new Blob([content], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      this.downloadFile(blob, 'docx')
    },

    async exportAsPdf() {
      // Create PDF using window.print() for simple implementation
      const printWindow = window.open('', '_blank')
      const content = this.generateHtmlContent()

      printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Use Case Specification</title>
        <link rel="icon" href="../../public/slack-brands-solid-full.svg">
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 11pt;
            line-height: 1.5; 
            margin: 20px;
            color: #000;
          }
          
          h1 {
            font-size: 16pt;
            font-weight: bold;
            margin: 12pt 0 8pt 0;
            color: #000;
          }
          
          h2 {
            font-size: 14pt;
            font-weight: bold;
            margin: 10pt 0 6pt 0;
            color: #000;
          }
          
          h3 {
            font-size: 12pt;
            font-weight: bold;
            margin: 8pt 0 4pt 0;
            color: #000;
          }
          
          .header { 
            border-bottom: 2px solid #1a365d; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          
          .project-info { 
            background: #f8fafc; 
            padding: 12px; 
            border-radius: 5px; 
            margin-bottom: 15px;
            border-left: 4px solid #1a365d;
            font-size: 11pt;
          }
          
          .project-info h3 {
            font-size: 12pt;
            margin-top: 0;
          }
          
          .project-info p {
            margin: 4pt 0;
            font-size: 11pt;
          }
          
          .toc { 
            margin-bottom: 20px; 
            padding: 12px;
            background: #f9fafb;
            border-radius: 5px;
            font-size: 11pt;
          }
          
          .toc h2 {
            font-size: 14pt;
            margin-top: 0;
          }
          
          .toc ul {
            margin: 8pt 0;
            padding-left: 20px;
          }
          
          .toc li {
            margin: 4pt 0;
            font-size: 11pt;
          }
          
          /* QUAN TRỌNG: Ngăn page break trong các section quan trọng */
          .usecase-section { 
            margin-bottom: 24pt; 
            page-break-inside: avoid;
            break-inside: avoid;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
          }
          
          .usecase-header { 
            background: #1a365d; 
            color: white; 
            padding: 8px 12px; 
            margin: -16px -16px 12px -16px;
            border-radius: 8px 8px 0 0;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .usecase-header h2 {
            font-size: 14pt;
            color: white;
            margin: 0;
          }
          
          .usecase-header p {
            font-size: 10pt;
            margin: 4pt 0 0 0;
            color: rgba(255, 255, 255, 0.9);
          }
          
          /* Đảm bảo các detail-item không bị tách rời */
          .detail-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 12px; 
            margin-bottom: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .detail-item { 
            margin-bottom: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .detail-item h4 { 
            margin: 0 0 4px 0; 
            color: #000;
            font-size: 11pt;
            font-weight: bold;
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .detail-item p { 
            margin: 0; 
            font-size: 11pt;
            line-height: 1.5;
            page-break-before: avoid;
            break-before: avoid;
          }
          
          .detail-item ul, .detail-item ol {
            margin: 4pt 0;
            padding-left: 20px;
            font-size: 11pt;
            line-height: 1.5;
          }
          
          .detail-item li {
            margin: 2pt 0;
          }
          
          /* Đặc biệt quan tâm đến các phần full-width */
          .full-width { 
            grid-column: 1 / -1; 
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Class mới để xử lý page break tốt hơn */
          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .keep-with-next {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          .three-columns {
            grid-template-columns: 1fr 1fr 1fr !important;
          }
          .two-columns {
            grid-template-columns: 1fr 1fr !important;
          }
          
          .task-list, .condition-list { 
            padding-left: 20px; 
            margin: 6pt 0;
            font-size: 11pt;
            line-height: 1.5;
          }
          
          .task-list li, .condition-list li {
            margin: 3pt 0;
          }
          
          .tag { 
            display: inline-block; 
            background: #e5e7eb; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-size: 10pt; 
            margin: 2px;
            line-height: 1.4;
          }
          
          .timestamp { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            font-size: 10pt;
            margin-top: 20pt;
          }
          
          /* Media print quan trọng */
          @media print {
            body { 
              margin: 20mm 15mm;
              font-size: 11pt;
              line-height: 1.5;
              color: #000;
            }
            
            h1 {
              font-size: 16pt;
              margin: 12pt 0 8pt 0;
            }
            
            h2 {
              font-size: 14pt;
              margin: 10pt 0 6pt 0;
            }
            
            h3 {
              font-size: 12pt;
              margin: 8pt 0 4pt 0;
            }
            
            .detail-item h4 {
              font-size: 11pt;
            }
            
            .detail-item p, .detail-item ul, .detail-item ol {
              font-size: 11pt;
            }
            
            .task-list, .condition-list {
              font-size: 11pt;
            }
            
            .tag {
              font-size: 10pt;
            }
            
            .timestamp {
              font-size: 10pt;
            }
            
            /* Quy tắc page break cho in ấn */
            .usecase-section { 
              page-break-inside: avoid;
              break-inside: avoid-page;
              margin-bottom: 20pt;
            }
            
            .detail-item,
            .detail-grid,
            .full-width {
              page-break-inside: avoid;
              break-inside: avoid-page;
            }
            
            h1, h2, h3, h4 {
              page-break-after: avoid;
              break-after: avoid;
            }
            
            /* Đảm bảo headings luôn đi cùng với nội dung */
            .detail-item h4 {
              page-break-after: avoid;
              break-after: avoid;
            }
            
            .detail-item h4 + * {
              page-break-before: avoid;
              break-before: avoid;
            }
            
            /* Cho phép page break ở một số vị trí an toàn */
            .usecase-section + .usecase-section {
              page-break-before: auto;
              break-before: auto;
            }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `)

      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
        printWindow.onafterprint = () => printWindow.close()
      }, 500)
    },

    generateDocumentContent() {
      let content = 'USE CASE SPECIFICATION DOCUMENT\n'
      content += '================================\n\n'

      // Project Information
      if (this.includeProjectInfo && this.projectInfo.name) {
        content += `Project: ${this.projectInfo.name}\n`
        if (this.projectInfo.version) content += `Version: ${this.projectInfo.version}\n`
        content += '\n'
      }

      // Timestamp
      if (this.includeTimestamp) {
        content += `Generated: ${new Date().toLocaleString()}\n\n`
      }

      // Table of Contents
      if (this.includeTableOfContents) {
        content += 'TABLE OF CONTENTS\n'
        content += '================\n'
        this.useCasesToExport.forEach((uc, index) => {
          content += `${index + 1}. ${uc.name} (UC-${this.getUsecaseId(uc)})\n`
        })
        content += '\n'
      }

      // Use Cases Content
      this.useCasesToExport.forEach((uc, index) => {
        content += `\n${index + 1}. USE CASE: ${uc.name}\n`
        content += `${'='.repeat(50)}\n`
        content += `ID: UC-${this.getUsecaseId(uc)}\n`
        const actorName = uc.actor?.name || uc.role?.name || 'Not specified'
        content += `Actor: ${actorName}\n`
        content += `Priority: ${uc.priority || 'Not specified'}\n\n`

        content += `Goal: ${uc.goal || 'Not specified'}\n\n`
        content += `Description: ${(uc.description || uc.business_reason || uc.reason) || 'Not specified'}\n\n`
        const contextStr = typeof uc.context === 'object' ? (uc.context.module || uc.context.scope || uc.context.system || '') : (uc.context || '')
        content += `Context: ${contextStr || 'Not specified'}\n\n`

        // Main Flow
        content += 'Main Flow:\n'
        const mainFlow = uc.main_flow || uc.tasks || []
        if (mainFlow.length > 0) {
          mainFlow.forEach((step, i) => {
            if (typeof step === 'object') {
              content += `  ${step.step || (i + 1)}. ${step.action || step}\n`
            } else {
              content += `  ${i + 1}. ${step}\n`
            }
          })
        } else {
          content += '  No tasks defined\n'
        }
        content += '\n'

        // Preconditions & Postconditions
        content += 'Preconditions:\n'
        if (uc.preconditions && uc.preconditions.length > 0) {
          uc.preconditions.forEach((precond, i) => {
            content += `  • ${precond}\n`
          })
        } else {
          content += '  None\n'
        }
        content += '\n'

        content += 'Postconditions:\n'
        if (uc.postconditions && uc.postconditions.length > 0) {
          uc.postconditions.forEach((postcond, i) => {
            content += `  • ${postcond}\n`
          })
        } else {
          content += '  None\n'
        }
        content += '\n'

        // Inputs & Outputs
        content += 'Inputs:\n'
        if (uc.inputs && uc.inputs.length > 0) {
          uc.inputs.forEach((input) => {
            content += `  [${input}] `
          })
          content += '\n'
        } else {
          content += '  None\n'
        }
        content += '\n'

        content += 'Outputs:\n'
        if (uc.outputs && uc.outputs.length > 0) {
          uc.outputs.forEach((output) => {
            content += `  [${output}] `
          })
          content += '\n'
        } else {
          content += '  None\n'
        }
        content += '\n'

        // Trigger, Rules, Non-functional Constraints
        content += 'Trigger:\n'
        if (uc.trigger && typeof uc.trigger === 'object') {
          content += `  • Event: ${uc.trigger.event || 'N/A'}\n`
          if (uc.trigger.source) {
            content += `  • Source: ${uc.trigger.source}\n`
          }
        } else if (uc.triggers && uc.triggers.length > 0) {
          uc.triggers.forEach((trigger) => {
            content += `  • ${trigger}\n`
          })
        } else {
          content += '  None\n'
        }
        content += '\n'

        content += 'Business Rules:\n'
        if (uc.rules && uc.rules.length > 0) {
          uc.rules.forEach((rule) => {
            content += `  • ${rule}\n`
          })
        } else {
          content += '  None\n'
        }
        content += '\n'

        content += 'Non-functional Constraints:\n'
        const constraints = uc.non_functional_constraints || uc.constraints || []
        if (constraints.length > 0) {
          constraints.forEach((constraint) => {
            content += `  • ${constraint}\n`
          })
        } else {
          content += '  None\n'
        }
        content += '\n'

        // Exceptions
        content += 'Exceptions:\n'
        if (uc.exceptions && uc.exceptions.length > 0) {
          uc.exceptions.forEach((exception) => {
            content += `  ⚠ ${exception}\n`
          })
        } else {
          content += '  No exceptions defined\n'
        }
        content += '\n'

        // Stakeholders & Related Use Cases
        content += 'Stakeholders:\n'
        if (uc.stakeholders && uc.stakeholders.length > 0) {
          uc.stakeholders.forEach((stakeholder) => {
            content += `  [${stakeholder}] `
          })
          content += '\n'
        } else {
          content += '  None\n'
        }
        content += '\n'

        content += 'Related Use Cases:\n'
        if (uc.related_usecases && uc.related_usecases.length > 0) {
          uc.related_usecases.forEach((relatedId) => {
            content += `  UC-${relatedId} `
          })
          content += '\n'
        } else {
          content += '  None\n'
        }
        content += '\n'

        // Feedback
        if (uc.feedback) {
          content += `Feedback: ${uc.feedback}\n\n`
        }

        content += '\n' + '='.repeat(50) + '\n\n'
      })

      return content
    },

    generateHtmlContent() {
      let html = ''

      // Header
      html += `
    <div class="header">
      <h1>Use Case Specification Document</h1>
      ${
        this.includeProjectInfo && this.projectInfo.name
          ? `
        <div class="project-info">
          <h3>Project Information</h3>
          <p><strong>Project:</strong> ${this.projectInfo.name}</p>
          ${
            this.projectInfo.version
              ? `<p><strong>Version:</strong> ${this.projectInfo.version}</p>`
              : ''
          }
        </div>
      `
          : ''
      }
      ${
        this.includeTimestamp
          ? `
        <div class="timestamp">
          Generated on: ${new Date().toLocaleString()}
        </div>
      `
          : ''
      }
    </div>
  `

      // Table of Contents
      if (this.includeTableOfContents && this.useCasesToExport.length > 0) {
        html += '<div class="toc"><h2>Table of Contents</h2><ul>'
        this.useCasesToExport.forEach((uc, index) => {
          html += `<li>${index + 1}. ${uc.name} (UC-${this.getUsecaseId(uc)})</li>`
        })
        html += '</ul></div>'
      }

      // Use Cases - THÊM CLASS page-break-avoid cho các phần quan trọng
      this.useCasesToExport.forEach((uc, index) => {
        html += `
      <div class="usecase-section page-break-avoid">
        <div class="usecase-header keep-with-next">
          <h2>${index + 1}. ${uc.name}</h2>
          <p>UC-${this.getUsecaseId(uc)} | Actor: ${(uc.actor?.name || uc.role?.name) || 'Not specified'} | Priority: ${
          uc.priority || 'Not specified'
        }</p>
        </div>
        
        <!-- Goal, Description, Context -->
        <div class="detail-grid three-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Goal</h4>
            <p>${this.escapeHtml(uc.goal || 'Not specified')}</p>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Description</h4>
            <p>${this.escapeHtml((uc.description || uc.business_reason || uc.reason) || 'Not specified')}</p>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Context</h4>
            <p>${this.escapeHtml(uc.context || 'Not specified')}</p>
          </div>
        </div>
        
        <!-- Main Flow -->
        <div class="detail-item full-width page-break-avoid">
          <h4 class="keep-with-next">Main Flow</h4>
          <ol class="task-list">
            ${
              (() => {
                const mainFlow = uc.main_flow || uc.tasks || []
                if (mainFlow.length > 0) {
                  return mainFlow.map((step, i) => {
                    if (typeof step === 'object') {
                      return `<li><strong>Step ${step.step || (i + 1)}:</strong> ${this.escapeHtml(step.action || step)}${step.expected_result ? ` → ${this.escapeHtml(step.expected_result)}` : ''}</li>`
                    } else {
                      return `<li>${this.escapeHtml(step)}</li>`
                    }
                  }).join('')
                } else {
                  return '<li>No tasks defined</li>'
                }
              })()
            }
          </ol>
        </div>
        
        <!-- Preconditions & Postconditions -->
        <div class="detail-grid two-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Preconditions</h4>
            <ul class="condition-list">
              ${
                uc.preconditions && uc.preconditions.length > 0
                  ? uc.preconditions
                      .map((precond) => `<li>${this.escapeHtml(precond)}</li>`)
                      .join('')
                  : '<li>None</li>'
              }
            </ul>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Postconditions</h4>
            <ul class="condition-list">
              ${
                uc.postconditions && uc.postconditions.length > 0
                  ? uc.postconditions
                      .map((postcond) => `<li>${this.escapeHtml(postcond)}</li>`)
                      .join('')
                  : '<li>None</li>'
              }
            </ul>
          </div>
        </div>
        
        <!-- Inputs & Outputs -->
        <div class="detail-grid two-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Inputs</h4>
            <div>
              ${
                uc.inputs && uc.inputs.length > 0
                  ? uc.inputs
                      .map((input) => `<span class="tag">${this.escapeHtml(input)}</span>`)
                      .join('')
                  : '<span class="tag">None</span>'
              }
            </div>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Outputs</h4>
            <div>
              ${
                uc.outputs && uc.outputs.length > 0
                  ? uc.outputs
                      .map((output) => `<span class="tag">${this.escapeHtml(output)}</span>`)
                      .join('')
                  : '<span class="tag">None</span>'
              }
            </div>
          </div>
        </div>
        
        <!-- Triggers & Business Rules -->
        <div class="detail-grid two-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Triggers</h4>
            <ul class="condition-list">
              ${
                (() => {
                  if (uc.trigger && typeof uc.trigger === 'object') {
                    return `<li><strong>Event:</strong> ${this.escapeHtml(uc.trigger.event || 'N/A')}</li>${uc.trigger.source ? `<li><strong>Source:</strong> ${this.escapeHtml(uc.trigger.source)}</li>` : ''}`
                  } else if (uc.triggers && uc.triggers.length > 0) {
                    return uc.triggers.map((trigger) => `<li>${this.escapeHtml(trigger)}</li>`).join('')
                  } else {
                    return '<li>None</li>'
                  }
                })()
              }
            </ul>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Business Rules</h4>
            <ul class="condition-list">
              ${
                uc.rules && uc.rules.length > 0
                  ? uc.rules.map((rule) => `<li>${this.escapeHtml(rule)}</li>`).join('')
                  : '<li>None</li>'
              }
            </ul>
          </div>
        </div>
        
        <!-- Constraints & Exceptions -->
        <div class="detail-grid two-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Constraints</h4>
            <ul class="condition-list">
              ${
                (() => {
                  const constraints = uc.non_functional_constraints || uc.constraints || []
                  if (constraints.length > 0) {
                    return constraints.map((constraint) => `<li>${this.escapeHtml(constraint)}</li>`).join('')
                  } else {
                    return '<li>None</li>'
                  }
                })()
              }
            </ul>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Exceptions</h4>
            <ul class="condition-list">
              ${
                uc.exceptions && uc.exceptions.length > 0
                  ? uc.exceptions
                      .map((exception) => `<li>⚠ ${this.escapeHtml(exception)}</li>`)
                      .join('')
                  : '<li>No exceptions defined</li>'
              }
            </ul>
          </div>
        </div>
        
        <!-- Stakeholders & Related Use Cases -->
        <div class="detail-grid two-columns page-break-avoid">
          <div class="detail-item">
            <h4 class="keep-with-next">Stakeholders</h4>
            <div>
              ${
                uc.stakeholders && uc.stakeholders.length > 0
                  ? uc.stakeholders
                      .map(
                        (stakeholder) => `<span class="tag">${this.escapeHtml(stakeholder)}</span>`
                      )
                      .join('')
                  : '<span class="tag">None</span>'
              }
            </div>
          </div>
          <div class="detail-item">
            <h4 class="keep-with-next">Related Use Cases</h4>
            <div>
              ${
                uc.related_usecases && uc.related_usecases.length > 0
                  ? uc.related_usecases
                      .map(
                        (relatedId) => `<span class="tag">UC-${this.escapeHtml(relatedId)}</span>`
                      )
                      .join('')
                  : '<span class="tag">None</span>'
              }
            </div>
          </div>
        </div>
        
        ${
          uc.feedback
            ? `
          <div class="detail-item full-width page-break-avoid">
            <h4 class="keep-with-next">Feedback</h4>
            <p>${this.escapeHtml(uc.feedback)}</p>
          </div>
        `
            : ''
        }
      </div>
    `
      })

      return html
    },

    downloadFile(blob, format) {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().split('T')[0]
      const scopeSuffix = this.exportScope !== 'all' ? `-${this.exportScope}` : ''
      const filename = `UseCase-Specification-${timestamp}${scopeSuffix}.${format}`

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    escapeHtml(unsafe) {
      if (!unsafe) return ''
      return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>')
    },
  },

  created() {
    this.toast = useToast()
  },

  watch: {
    exportScope(newScope) {
      if (newScope === 'selected' && this.selectedUseCases.length === 0) {
        this.exportScope = 'all'
      }
    },

    selectedRole(newRole) {
      if (newRole && !this.roleUseCaseCounts[newRole]) {
        this.selectedRole = ''
      }
    },
  },
}
</script>

<style scoped>
.export-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.export-modal-content {
  background: white;
  border-radius: 12px;
  width: 800px;
  height: 700px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.export-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.export-modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.2rem;
  font-weight: 600;
}

.export-modal-body {
  padding: 4px 20px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-section {
  margin-bottom: 0;
}

.export-section h4 {
  margin: 0 0 10px 0;
  color: #374151;
  font-size: 0.95rem;
  font-weight: 600;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.format-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-option:hover {
  border-color: #9ca3af;
}

.format-option.active {
  border-color: #1a365d;
  background: #f8fafc;
}

.format-radio {
  display: none;
}

.format-icon {
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.format-option.active .format-icon {
  background: #1a365d;
  color: white;
}

.format-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.format-info strong {
  color: #1f2937;
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.format-info span {
  color: #6b7280;
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scope-options {
  display: flex;
  flex-direction: column;
}

.scope-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 0.85rem;
}

.scope-option:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  color: #6b7280;
  font-size: 0.7rem;
  font-style: italic;
}

.role-selection {
  margin-top: 8px;
}

.role-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font-size: 0.8rem;
}

.document-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.option-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  font-size: 0.85rem;
}

.preview-info {
  background: #f8fafc;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #e5e7eb;
}

.preview-info p {
  margin: 3px 0;
  font-size: 0.8rem;
  color: #4b5563;
}

.export-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.btn-primary,
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.btn-primary {
  background: #1a365d;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2d4a8a;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.button-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn-close {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f3f4f6;
}

.material-symbols-outlined {
  font-size: 18px;
}
</style>