<template>
  <div class="visualization-view">
    <div v-if="!item" class="empty-state">
      <span class="material-symbols-outlined empty-icon">dashboard</span>
      <p>Select an item to visualize</p>
    </div>

    <div v-else class="visualization-content">
      <!-- Use Case Visualization -->
      <div v-if="itemType === 'usecase'" class="usecase-viz">
        <div class="viz-header">
          <h3>{{ item.name }}</h3>
          <div class="header-actions">
            <span class="badge">{{ item.priority || 'medium' }}</span>
            <button @click="editMode = !editMode" class="edit-btn">
              <span class="material-symbols-outlined">{{ editMode ? 'close' : 'edit' }}</span>
            </button>
          </div>
        </div>
        
        <div v-if="!editMode">
          <div class="viz-section">
            <h4>
              <span class="material-symbols-outlined">flag</span>
              Goal
              <button v-if="editingField !== 'goal'" @click.stop="startEditField('goal')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'goal'" class="inline-edit">
              <textarea v-model="editedItem.goal" class="form-textarea" rows="3" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <p v-else>{{ item.goal }}</p>
          </div>
          <div class="viz-section" v-if="item.role">
            <h4>
              <span class="material-symbols-outlined">person</span>
              Role
              <button v-if="editingField !== 'role'" @click.stop="startEditField('role')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'role'" class="inline-edit">
              <input v-model="editedItem.role.name" type="text" class="form-input" @blur="saveField" />
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <p v-else>{{ item.role.name || item.role }}</p>
          </div>
          <div class="viz-section" v-if="item.tasks && item.tasks.length > 0">
            <h4>
              <span class="material-symbols-outlined">list</span>
              Tasks
              <button v-if="editingField !== 'tasks'" @click.stop="startEditField('tasks')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'tasks'" class="inline-edit">
              <textarea v-model="tasksText" class="form-textarea" rows="5" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <ul v-else class="task-list">
              <li v-for="(task, idx) in item.tasks" :key="idx" class="task-item">
                <span>{{ task }}</span>
                <button @click.stop="removeListItem('tasks', idx)" class="task-remove" title="Remove task">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </li>
              <li v-if="!item.tasks || item.tasks.length === 0" class="empty-list">No tasks</li>
              <li>
                <button @click.stop="addListItem('tasks')" class="task-add">
                  <span class="material-symbols-outlined">add</span>
                  Add Task
                </button>
              </li>
            </ul>
          </div>
          <div class="viz-section">
            <h4>
              <span class="material-symbols-outlined">input</span>
              Inputs
              <button v-if="editingField !== 'inputs'" @click.stop="startEditField('inputs')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'inputs'" class="inline-edit">
              <input v-model="inputsText" type="text" class="form-input" placeholder="input1, input2, input3" @blur="saveField" />
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <div v-else class="tag-list">
              <span v-if="!item.inputs || item.inputs.length === 0" class="empty-list">No inputs</span>
              <span v-for="(input, idx) in (item.inputs || [])" :key="idx" class="tag">
                <span v-if="editingListItem !== `inputs-${idx}`">{{ input }}</span>
                <input 
                  v-else
                  v-model="editedListItemValue"
                  @blur="saveListItem('inputs', idx)"
                  @keydown.enter="saveListItem('inputs', idx)"
                  @keydown.esc="cancelEditListItem"
                  class="tag-input"
                  @click.stop
                />
                <button 
                  v-if="editingListItem !== `inputs-${idx}`"
                  @click.stop="editListItem('inputs', idx, input)" 
                  class="tag-edit"
                  title="Edit"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button @click.stop="removeListItem('inputs', idx)" class="tag-remove" title="Remove">×</button>
              </span>
              <button @click.stop="addListItem('inputs')" class="tag-add">+ Add</button>
            </div>
          </div>
          <div class="viz-section">
            <h4>
              <span class="material-symbols-outlined">output</span>
              Outputs
              <button v-if="editingField !== 'outputs'" @click.stop="startEditField('outputs')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'outputs'" class="inline-edit">
              <input v-model="outputsText" type="text" class="form-input" placeholder="output1, output2, output3" @blur="saveField" />
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <div v-else class="tag-list">
              <span v-if="!item.outputs || item.outputs.length === 0" class="empty-list">No outputs</span>
              <span v-for="(output, idx) in (item.outputs || [])" :key="idx" class="tag">
                <span v-if="editingListItem !== `outputs-${idx}`">{{ output }}</span>
                <input 
                  v-else
                  v-model="editedListItemValue"
                  @blur="saveListItem('outputs', idx)"
                  @keydown.enter="saveListItem('outputs', idx)"
                  @keydown.esc="cancelEditListItem"
                  class="tag-input"
                  @click.stop
                />
                <button 
                  v-if="editingListItem !== `outputs-${idx}`"
                  @click.stop="editListItem('outputs', idx, output)" 
                  class="tag-edit"
                  title="Edit"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button @click.stop="removeListItem('outputs', idx)" class="tag-remove" title="Remove">×</button>
              </span>
              <button @click.stop="addListItem('outputs')" class="tag-add">+ Add</button>
            </div>
          </div>
        </div>
        
        <div v-else class="edit-section">
          <div class="form-group">
            <label>Name</label>
            <input v-model="editedItem.name" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Goal</label>
            <textarea v-model="editedItem.goal" class="form-textarea" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select v-model="editedItem.priority" class="form-input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div class="form-group">
            <label>Role</label>
            <input v-model="editedItem.role.name" type="text" class="form-input" placeholder="Role name" />
          </div>
          <div class="form-group">
            <label>Tasks (one per line)</label>
            <textarea v-model="tasksText" class="form-textarea" rows="5" placeholder="Task 1&#10;Task 2&#10;Task 3"></textarea>
          </div>
          <div class="form-group">
            <label>Inputs (comma separated)</label>
            <input v-model="inputsText" type="text" class="form-input" placeholder="input1, input2, input3" />
          </div>
          <div class="form-group">
            <label>Outputs (comma separated)</label>
            <input v-model="outputsText" type="text" class="form-input" placeholder="output1, output2, output3" />
          </div>
          <div class="action-buttons">
            <button @click="saveChanges" class="save-btn">
              <span class="material-symbols-outlined">save</span>
              Save Changes
            </button>
            <button @click="cancelEdit" class="cancel-btn">
              <span class="material-symbols-outlined">close</span>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Test Case Visualization -->
      <div v-else-if="itemType === 'testcase'" class="testcase-viz">
        <div class="viz-header">
          <h3>{{ item.title }}</h3>
          <div class="header-actions">
            <span class="badge" :class="item.test_type">{{ item.test_type }}</span>
            <button @click="editMode = !editMode" class="edit-btn">
              <span class="material-symbols-outlined">{{ editMode ? 'close' : 'edit' }}</span>
            </button>
          </div>
        </div>
        
        <div v-if="!editMode">
          <div class="viz-section" v-if="item.description">
            <h4>
              <span class="material-symbols-outlined">description</span>
              Description
              <button v-if="editingField !== 'description'" @click.stop="startEditField('description')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'description'" class="inline-edit">
              <textarea v-model="editedItem.description" class="form-textarea" rows="3" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <p v-else>{{ item.description }}</p>
          </div>
          <div class="viz-section">
            <h4>
              <span class="material-symbols-outlined">play_arrow</span>
              Steps
              <button v-if="editingField !== 'steps'" @click.stop="startEditField('steps')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'steps'" class="inline-edit">
              <textarea v-model="stepsText" class="form-textarea" rows="5" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <ol v-else class="step-list">
              <li v-if="!item.steps || item.steps.length === 0" class="empty-list">No steps</li>
              <li v-for="(step, idx) in (item.steps || [])" :key="idx" class="step-item">
                <strong>{{ step.step_number || idx + 1 }}.</strong> 
                <span v-if="editingListItem !== `steps-${idx}`">{{ step.action || step }}</span>
                <input 
                  v-else
                  v-model="editedListItemValue"
                  @blur="saveStepItem(idx)"
                  @keydown.enter="saveStepItem(idx)"
                  @keydown.esc="cancelEditListItem"
                  class="step-input"
                  @click.stop
                />
                <button 
                  v-if="editingListItem !== `steps-${idx}`"
                  @click.stop="editStepItem(idx, step)" 
                  class="step-edit"
                  title="Edit step"
                >
                  <span class="material-symbols-outlined">edit</span>
                </button>
                <button @click.stop="removeStepItem(idx)" class="step-remove" title="Remove step">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </li>
              <li>
                <button @click.stop="addStepItem" class="step-add">
                  <span class="material-symbols-outlined">add</span>
                  Add Step
                </button>
              </li>
            </ol>
          </div>
          <div class="viz-section" v-if="item.expected_result">
            <h4>
              <span class="material-symbols-outlined">check_circle</span>
              Expected Result
              <button v-if="editingField !== 'expected_result'" @click.stop="startEditField('expected_result')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'expected_result'" class="inline-edit">
              <textarea v-model="editedItem.expected_result" class="form-textarea" rows="3" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <p v-else>{{ item.expected_result }}</p>
          </div>
        </div>
        
        <div v-else class="edit-section">
          <div class="form-group">
            <label>Title</label>
            <input v-model="editedItem.title" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="editedItem.description" class="form-textarea" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Test Type</label>
            <select v-model="editedItem.test_type" class="form-input">
              <option value="functional">Functional</option>
              <option value="integration">Integration</option>
              <option value="unit">Unit</option>
              <option value="e2e">E2E</option>
            </select>
          </div>
          <div class="form-group">
            <label>Steps (JSON format or one per line)</label>
            <textarea v-model="stepsText" class="form-textarea" rows="5" placeholder='[{"step_number": 1, "action": "Step 1"}, ...]'></textarea>
          </div>
          <div class="form-group">
            <label>Expected Result</label>
            <textarea v-model="editedItem.expected_result" class="form-textarea" rows="3"></textarea>
          </div>
          <div class="action-buttons">
            <button @click="saveChanges" class="save-btn">
              <span class="material-symbols-outlined">save</span>
              Save Changes
            </button>
            <button @click="cancelEdit" class="cancel-btn">
              <span class="material-symbols-outlined">close</span>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Database Table Visualization -->
      <div v-else-if="itemType === 'table'" class="table-viz">
        <div class="viz-header">
          <h3>{{ item.name }}</h3>
          <div class="header-actions">
            <button @click="editMode = !editMode" class="edit-btn">
              <span class="material-symbols-outlined">{{ editMode ? 'close' : 'edit' }}</span>
            </button>
            <button @click="addColumn" class="add-btn">
              <span class="material-symbols-outlined">add</span>
              Add Column
            </button>
          </div>
        </div>
        
        <div v-if="!editMode">
          <div class="viz-section" v-if="item.description">
            <h4>
              <span class="material-symbols-outlined">description</span>
              Description
              <button v-if="editingField !== 'description'" @click.stop="startEditField('description')" class="inline-edit-btn">
                <span class="material-symbols-outlined">edit</span>
              </button>
            </h4>
            <div v-if="editingField === 'description'" class="inline-edit">
              <textarea v-model="editedItem.description" class="form-textarea" rows="2" @blur="saveField" @keydown.ctrl.enter="saveField"></textarea>
              <div class="inline-edit-actions">
                <button @click="saveField" class="save-btn small">Save</button>
                <button @click="editingField = null" class="cancel-btn small">Cancel</button>
              </div>
            </div>
            <p v-else>{{ item.description || 'No description' }}</p>
          </div>
          
          <div class="viz-section">
            <div class="section-header">
              <h4>
                <span class="material-symbols-outlined">view_column</span>
                Columns ({{ item.columns?.length || 0 }})
              </h4>
            </div>
            <div v-if="!item.columns || item.columns.length === 0" class="empty-list">No columns</div>
            <table v-else class="columns-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Primary Key</th>
                  <th>Foreign Key</th>
                  <th>References</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(col, idx) in item.columns" :key="idx" class="column-row">
                  <td><code>{{ col.name }}</code></td>
                  <td><code>{{ col.type }}{{ col.length ? `(${col.length})` : '' }}</code></td>
                  <td>
                    <span class="material-symbols-outlined" :class="{ 'text-success': col.nullable, 'text-error': !col.nullable }">
                      {{ col.nullable ? 'check' : 'close' }}
                    </span>
                  </td>
                  <td>
                    <span v-if="col.is_primary_key" class="badge primary">PK</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <span v-if="col.is_foreign_key" class="badge foreign">FK</span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td>
                    <code v-if="col.references">{{ col.references }}</code>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div v-if="editMode" class="edit-section">
          <div class="form-group">
            <label>Table Name</label>
            <input v-model="editedItem.name" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="editedItem.description" class="form-textarea" rows="2"></textarea>
          </div>
        </div>
        
        <div class="viz-section" v-if="editMode && item.columns && item.columns.length > 0">
          <div class="section-header">
            <h4>
              <span class="material-symbols-outlined">view_column</span>
              Columns
            </h4>
            <button v-if="editMode" @click="addColumn" class="icon-btn">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
          <table class="columns-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Key</th>
                <th v-if="editMode">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(col, idx) in item.columns" :key="idx" @click="editMode && editColumn(col, idx)" :class="{ 'editable': editMode }">
                <td>
                  <span v-if="!editMode || editingColumnIdx !== idx">{{ col.name }}</span>
                  <input v-else v-model="editingColumn.name" class="inline-input" />
                </td>
                <td>
                  <code v-if="!editMode || editingColumnIdx !== idx">{{ col.type }}</code>
                  <select v-else v-model="editingColumn.type" class="inline-select">
                    <option>VARCHAR</option>
                    <option>INT</option>
                    <option>BIGINT</option>
                    <option>BOOLEAN</option>
                    <option>DATE</option>
                    <option>DATETIME</option>
                    <option>TEXT</option>
                  </select>
                </td>
                <td>
                  <span class="material-symbols-outlined" v-if="!editMode && col.nullable">check</span>
                  <span class="material-symbols-outlined" v-else-if="!editMode">close</span>
                  <input v-else type="checkbox" v-model="editingColumn.nullable" />
                </td>
                <td>
                  <span v-if="col.is_primary_key" class="badge primary">PK</span>
                  <span v-if="col.is_foreign_key" class="badge foreign">FK</span>
                  <div v-if="editMode && editingColumnIdx === idx" class="key-options">
                    <label><input type="checkbox" v-model="editingColumn.is_primary_key" /> PK</label>
                    <label><input type="checkbox" v-model="editingColumn.is_foreign_key" /> FK</label>
                  </div>
                </td>
                <td v-if="editMode">
                  <button @click.stop="saveColumn(idx)" class="icon-btn small">
                    <span class="material-symbols-outlined">check</span>
                  </button>
                  <button @click.stop="deleteColumn(idx)" class="icon-btn small">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div v-if="editMode" class="action-buttons">
          <button @click="saveChanges" class="save-btn">
            <span class="material-symbols-outlined">save</span>
            Save Changes
          </button>
          <button @click="cancelEdit" class="cancel-btn">
            <span class="material-symbols-outlined">close</span>
            Cancel
          </button>
        </div>
      </div>
      
      <!-- Column Visualization -->
      <div v-else-if="itemType === 'column'" class="column-viz">
        <div class="viz-header">
          <h3>{{ item.name }}</h3>
          <button @click="editMode = !editMode" class="edit-btn">
            <span class="material-symbols-outlined">{{ editMode ? 'close' : 'edit' }}</span>
          </button>
        </div>
        <div v-if="!editMode" class="viz-section">
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Type:</span>
              <code>{{ item.type }}</code>
            </div>
            <div class="info-item">
              <span class="label">Nullable:</span>
              <span class="material-symbols-outlined">{{ item.nullable ? 'check' : 'close' }}</span>
            </div>
            <div class="info-item" v-if="item.is_primary_key">
              <span class="badge primary">Primary Key</span>
            </div>
            <div class="info-item" v-if="item.is_foreign_key">
              <span class="badge foreign">Foreign Key</span>
            </div>
          </div>
        </div>
        <div v-else class="edit-section">
          <div class="form-group">
            <label>Column Name</label>
            <input v-model="editedItem.name" type="text" class="form-input" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="editedItem.type" class="form-input">
              <option>VARCHAR</option>
              <option>INT</option>
              <option>BIGINT</option>
              <option>BOOLEAN</option>
              <option>DATE</option>
              <option>DATETIME</option>
              <option>TEXT</option>
            </select>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="editedItem.nullable" />
              Nullable
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="editedItem.is_primary_key" />
              Primary Key
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="editedItem.is_foreign_key" />
              Foreign Key
            </label>
          </div>
          <div class="action-buttons">
            <button @click="saveChanges" class="save-btn">
              <span class="material-symbols-outlined">save</span>
              Save
            </button>
            <button @click="cancelEdit" class="cancel-btn">
              <span class="material-symbols-outlined">close</span>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Default JSON View -->
      <div v-else class="json-viz">
        <div class="viz-header">
          <h3>{{ item.name || item.title || 'Item Details' }}</h3>
        </div>
        <pre class="json-preview">{{ JSON.stringify(item, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { updateTableInDatabase, getDatabaseById, usecaseApi } from '@/api/project'
import { updateTestCase } from '@/api/testcase'

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  itemType: {
    type: String,
    default: null
  },
  projectId: {
    type: String,
    default: null
  },
  versionId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['item-updated', 'refresh-requested'])

const editMode = ref(false)
const editingField = ref(null) // Track which field is being edited
const editedItem = ref({})
const editingColumnIdx = ref(-1)
const editingColumn = ref({})
const editingListItem = ref(null) // Track which list item is being edited (e.g., 'inputs-0', 'outputs-1')
const editedListItemValue = ref('') // Value being edited for list item

// Computed properties for usecase/testcase editing
const tasksText = computed({
  get: () => editedItem.value.tasks ? editedItem.value.tasks.join('\n') : '',
  set: (val) => {
    editedItem.value.tasks = val.split('\n').filter(t => t.trim())
  }
})

const inputsText = computed({
  get: () => editedItem.value.inputs ? editedItem.value.inputs.join(', ') : '',
  set: (val) => {
    editedItem.value.inputs = val.split(',').map(i => i.trim()).filter(i => i)
  }
})

const outputsText = computed({
  get: () => editedItem.value.outputs ? editedItem.value.outputs.join(', ') : '',
  set: (val) => {
    editedItem.value.outputs = val.split(',').map(o => o.trim()).filter(o => o)
  }
})

const stepsText = computed({
  get: () => {
    if (!editedItem.value.steps) return ''
    try {
      return JSON.stringify(editedItem.value.steps, null, 2)
    } catch {
      return editedItem.value.steps.map((s, i) => `${i + 1}. ${s.action || s}`).join('\n')
    }
  },
  set: (val) => {
    try {
      editedItem.value.steps = JSON.parse(val)
    } catch {
      // Parse as simple text lines
      editedItem.value.steps = val.split('\n')
        .filter(s => s.trim())
        .map((s, i) => ({
          step_number: i + 1,
          action: s.replace(/^\d+\.\s*/, '').trim()
        }))
    }
  }
})

// Watch for item changes
watch(() => props.item, (newItem) => {
  if (newItem) {
    editedItem.value = { ...newItem }
    // Ensure role is an object
    if (props.itemType === 'usecase' && typeof editedItem.value.role === 'string') {
      editedItem.value.role = { name: editedItem.value.role }
    }
  }
}, { immediate: true, deep: true })

const addColumn = () => {
  if (!props.item.columns) {
    editedItem.value.columns = []
  }
  editedItem.value.columns.push({
    name: 'new_column',
    type: 'VARCHAR',
    nullable: true,
    is_primary_key: false,
    is_foreign_key: false
  })
  editingColumnIdx.value = editedItem.value.columns.length - 1
  editingColumn.value = { ...editedItem.value.columns[editingColumnIdx.value] }
}

const editColumn = (col, idx) => {
  editingColumnIdx.value = idx
  editingColumn.value = { ...col }
}

const saveColumn = (idx) => {
  if (editingColumn.value.name) {
    editedItem.value.columns[idx] = { ...editingColumn.value }
    editingColumnIdx.value = -1
    editingColumn.value = {}
  }
}

const deleteColumn = (idx) => {
  if (confirm('Delete this column?')) {
    editedItem.value.columns.splice(idx, 1)
    editingColumnIdx.value = -1
  }
}

const saveChanges = async () => {
  try {
    if (props.itemType === 'usecase' && props.versionId) {
      // Backend tìm usecase bằng field 'id' trong requirement_model, không phải '_id'
      // Usecase từ API trả về requirement_model array, mỗi item có field 'id'
      const usecaseId = props.item.id
      if (!usecaseId) {
        console.error('Usecase ID not found. Item:', props.item)
        throw new Error('Usecase ID not found. Usecase must have an "id" field.')
      }
      console.log('Updating usecase:', { 
        versionId: props.versionId, 
        usecaseId, 
        itemId: props.item.id,
        item_id: props.item._id,
        data: editedItem.value 
      })
      await usecaseApi.updateUsecase(props.versionId, usecaseId, editedItem.value)
      emit('item-updated', editedItem.value, props.itemType)
      emit('refresh-requested')
      editMode.value = false
    } else if (props.itemType === 'testcase' && props.item._id) {
      // Save testcase changes
      await updateTestCase(props.item._id, editedItem.value)
      emit('item-updated', editedItem.value, props.itemType)
      emit('refresh-requested')
      editMode.value = false
    } else if (props.itemType === 'table' && props.item.databaseId) {
      // Save table changes
      const originalTableName = props.item.name
      const tableData = {
        name: editedItem.value.name,
        description: editedItem.value.description,
        columns: editedItem.value.columns.map((col, idx) => ({
          ...col,
          // Ensure primary_key_order for composite keys
          primary_key_order: col.is_primary_key && !col.primary_key_order 
            ? (editedItem.value.columns.filter(c => c.is_primary_key).indexOf(col) + 1)
            : col.primary_key_order
        }))
      }
      
      await updateTableInDatabase(
        props.item.databaseId,
        originalTableName,
        tableData
      )
      emit('item-updated', editedItem.value, props.itemType)
      emit('refresh-requested')
    } else if (props.itemType === 'column' && props.item.databaseId && props.item.tableName) {
      // For column, we need to load parent table and update it
      try {
        const dbRes = await getDatabaseById(props.item.databaseId)
        const db = dbRes.data?.data || dbRes.data
        const table = db.tables?.find(t => t.name === props.item.tableName)
        
        if (table) {
          // Update the column in the table
          const columnIndex = table.columns.findIndex(c => c.name === props.item.name)
          if (columnIndex >= 0) {
            table.columns[columnIndex] = { ...editedItem.value }
          } else {
            // Column not found, add it
            table.columns.push({ ...editedItem.value })
          }
          
          // Save the updated table
          await updateTableInDatabase(
            props.item.databaseId,
            props.item.tableName,
            {
              name: table.name,
              description: table.description,
              columns: table.columns
            }
          )
          emit('item-updated', editedItem.value, props.itemType)
          emit('refresh-requested')
        }
      } catch (error) {
        console.error('Error saving column:', error)
        alert('Failed to save column: ' + (error.response?.data?.message || error.message))
      }
    } else {
      // For other types, just emit
      emit('item-updated', editedItem.value, props.itemType)
    }
    editMode.value = false
    editingColumnIdx.value = -1
  } catch (error) {
    console.error('Error saving changes:', error)
    alert('Failed to save changes: ' + (error.response?.data?.message || error.message))
  }
}

const cancelEdit = () => {
  editedItem.value = { ...props.item }
  editMode.value = false
  editingField.value = null
  editingColumnIdx.value = -1
}

const startEditField = (fieldName) => {
  editingField.value = fieldName
  if (fieldName === 'tasks') {
    // Initialize tasksText
    tasksText.value = editedItem.value.tasks ? editedItem.value.tasks.join('\n') : ''
  } else if (fieldName === 'inputs') {
    inputsText.value = editedItem.value.inputs ? editedItem.value.inputs.join(', ') : ''
  } else if (fieldName === 'outputs') {
    outputsText.value = editedItem.value.outputs ? editedItem.value.outputs.join(', ') : ''
  }
}

const saveField = async () => {
  if (!editingField.value) return
  
  try {
    if (props.itemType === 'usecase' && props.versionId) {
      // Backend tìm usecase bằng field 'id' trong requirement_model, không phải '_id'
      // Usecase từ API trả về requirement_model array, mỗi item có field 'id'
      const usecaseId = props.item.id
      if (!usecaseId) {
        console.error('Usecase ID not found. Item:', props.item)
        throw new Error('Usecase ID not found. Usecase must have an "id" field.')
      }
      console.log('Updating usecase:', { 
        versionId: props.versionId, 
        usecaseId, 
        itemId: props.item.id,
        item_id: props.item._id,
        data: editedItem.value 
      })
      await usecaseApi.updateUsecase(props.versionId, usecaseId, editedItem.value)
      emit('item-updated', editedItem.value, props.itemType)
      emit('refresh-requested')
    } else if (props.itemType === 'testcase' && props.item._id) {
      await updateTestCase(props.item._id, editedItem.value)
      emit('item-updated', editedItem.value, props.itemType)
      emit('refresh-requested')
    }
    editingField.value = null
  } catch (error) {
    console.error('Error saving field:', error)
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message
    alert('Failed to save changes: ' + errorMsg)
  }
}

const addListItem = (fieldName) => {
  if (!editedItem.value[fieldName]) {
    editedItem.value[fieldName] = []
  }
  const newIndex = editedItem.value[fieldName].length
  editedItem.value[fieldName].push('')
  // Start editing the new item immediately
  editListItem(fieldName, newIndex, '')
}

// For tasks, we need to handle differently since they're strings, not objects
const saveListItem = async (fieldName, index) => {
  if (editedListItemValue.value.trim()) {
    if (!editedItem.value[fieldName]) {
      editedItem.value[fieldName] = []
    }
    editedItem.value[fieldName][index] = editedListItemValue.value.trim()
    await saveField()
  }
  cancelEditListItem()
}

const editListItem = (fieldName, index, currentValue) => {
  editingListItem.value = `${fieldName}-${index}`
  editedListItemValue.value = currentValue
  // Focus the input after it's rendered
  setTimeout(() => {
    const input = document.querySelector('.tag-input')
    if (input) input.focus()
  }, 0)
}

const cancelEditListItem = () => {
  editingListItem.value = null
  editedListItemValue.value = ''
}

const removeListItem = async (fieldName, index) => {
  if (editedItem.value[fieldName]) {
    editedItem.value[fieldName].splice(index, 1)
    await saveField()
  }
}

// Testcase step management
const editStepItem = (index, step) => {
  editingListItem.value = `steps-${index}`
  editedListItemValue.value = step.action || step
  setTimeout(() => {
    const input = document.querySelector('.step-input')
    if (input) input.focus()
  }, 0)
}

const saveStepItem = async (index) => {
  if (editedListItemValue.value.trim()) {
    if (!editedItem.value.steps) {
      editedItem.value.steps = []
    }
    const step = editedItem.value.steps[index]
    if (typeof step === 'object' && step !== null) {
      step.action = editedListItemValue.value.trim()
    } else {
      editedItem.value.steps[index] = {
        step_number: index + 1,
        action: editedListItemValue.value.trim()
      }
    }
    await saveField()
  }
  cancelEditListItem()
}

const removeStepItem = async (index) => {
  if (editedItem.value.steps) {
    editedItem.value.steps.splice(index, 1)
    // Renumber steps
    editedItem.value.steps.forEach((step, idx) => {
      if (typeof step === 'object' && step !== null) {
        step.step_number = idx + 1
      }
    })
    await saveField()
  }
}

const addStepItem = () => {
  if (!editedItem.value.steps) {
    editedItem.value.steps = []
  }
  const newIndex = editedItem.value.steps.length
  editedItem.value.steps.push({
    step_number: newIndex + 1,
    action: ''
  })
  editStepItem(newIndex, { action: '' })
}
</script>

<style scoped>
.visualization-view {
  height: 100%;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #858585;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.visualization-content {
  max-width: 100%;
}

.viz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #3e3e42;
}

.viz-header h3 {
  margin: 0;
  font-size: 20px;
  color: #cccccc;
}

.badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #3e3e42;
  color: #cccccc;
}

.badge.primary {
  background: #0e639c;
  color: white;
}

.badge.foreign {
  background: #6f42c1;
  color: white;
}

.viz-section {
  margin-bottom: 24px;
}

.viz-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #cccccc;
}

.viz-section h4 .material-symbols-outlined {
  font-size: 20px;
}

.viz-section p {
  margin: 0;
  color: #d4d4d4;
  line-height: 1.6;
}

.task-list,
.step-list {
  margin: 0;
  padding-left: 24px;
  color: #d4d4d4;
}

.task-list li,
.step-list li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  padding: 4px 12px;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  font-size: 13px;
  color: #cccccc;
}

.columns-table {
  width: 100%;
  border-collapse: collapse;
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}

.columns-table thead {
  background: #2d2d30;
}

.columns-table th {
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #cccccc;
  border-bottom: 2px solid #3e3e42;
}

.columns-table td {
  padding: 12px;
  font-size: 13px;
  color: #d4d4d4;
  border-bottom: 1px solid #3e3e42;
}

.columns-table code {
  background: #2d2d30;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.json-preview {
  background: #1e1e1e;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #d4d4d4;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.edit-btn,
.add-btn {
  background: #0e639c;
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.edit-btn:hover,
.add-btn:hover {
  background: #1177bb;
}

.edit-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #2d2d30;
  border-radius: 4px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  color: #cccccc;
  font-size: 13px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #0e639c;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.icon-btn {
  background: transparent;
  border: 1px solid #3e3e42;
  color: #cccccc;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #3e3e42;
}

.icon-btn.small {
  padding: 2px 4px;
}

.icon-btn .material-symbols-outlined {
  font-size: 16px;
}

.columns-table tr.editable {
  cursor: pointer;
}

.columns-table tr.editable:hover {
  background: #2d2d30;
}

.inline-input,
.inline-select {
  background: #3c3c3c;
  border: 1px solid #0e639c;
  border-radius: 4px;
  padding: 4px 8px;
  color: #cccccc;
  font-size: 13px;
  width: 100%;
}

.key-options {
  display: flex;
  gap: 12px;
}

.key-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #cccccc;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.save-btn,
.cancel-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.save-btn {
  background: #0e639c;
  color: white;
}

.save-btn:hover {
  background: #1177bb;
}

.cancel-btn {
  background: #5a1d1d;
  color: white;
}

.cancel-btn:hover {
  background: #7a2d2d;
}

.column-viz .info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-item .label {
  color: #858585;
  font-size: 13px;
}

.info-item code {
  background: #2d2d30;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.editable-field {
  cursor: pointer;
  transition: background 0.2s;
}

.editable-field:hover {
  background: rgba(14, 99, 156, 0.1);
}

.inline-edit-btn {
  background: transparent;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  opacity: 0;
  transition: all 0.2s;
}

.viz-section:hover .inline-edit-btn {
  opacity: 1;
}

.inline-edit-btn:hover {
  background: #3e3e42;
  color: #cccccc;
}

.inline-edit {
  margin-top: 8px;
}

.inline-edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.save-btn.small,
.cancel-btn.small {
  padding: 4px 12px;
  font-size: 12px;
}

.tag-remove {
  background: transparent;
  border: none;
  color: #f48771;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 4px;
  font-size: 16px;
  line-height: 1;
  border-radius: 2px;
}

.tag-remove:hover {
  background: #5a1d1d;
}

.tag-add {
  background: #0e639c;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
}

.tag-add:hover {
  background: #1177bb;
}

.tag-edit {
  background: transparent;
  border: none;
  color: #0e639c;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 4px;
  font-size: 14px;
  line-height: 1;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: all 0.2s;
}

.tag:hover .tag-edit {
  opacity: 1;
}

.tag-edit:hover {
  background: #0e639c;
  color: white;
}

.tag-input {
  background: #3c3c3c;
  border: 1px solid #0e639c;
  border-radius: 4px;
  padding: 2px 6px;
  color: #cccccc;
  font-size: 12px;
  min-width: 100px;
  flex: 1;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.task-edit {
  background: transparent;
  border: none;
  color: #0e639c;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: all 0.2s;
}

.task-item:hover .task-edit {
  opacity: 1;
}

.task-edit:hover {
  background: #0e639c;
  color: white;
}

.task-remove,
.step-remove {
  background: transparent;
  border: none;
  color: #f48771;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: all 0.2s;
}

.task-item:hover .task-remove,
.step-item:hover .step-remove {
  opacity: 1;
}

.task-remove:hover,
.step-remove:hover {
  background: #5a1d1d;
  color: #f48771;
}

.task-add,
.step-add {
  background: #0e639c;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.task-add:hover,
.step-add:hover {
  background: #1177bb;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.step-edit {
  background: transparent;
  border: none;
  color: #0e639c;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: all 0.2s;
}

.step-item:hover .step-edit {
  opacity: 1;
}

.step-edit:hover {
  background: #0e639c;
  color: white;
}

.step-input {
  background: #3c3c3c;
  border: 1px solid #0e639c;
  border-radius: 4px;
  padding: 4px 8px;
  color: #cccccc;
  font-size: 13px;
  flex: 1;
  min-width: 200px;
}

.empty-list {
  color: #858585;
  font-style: italic;
  padding: 8px 0;
}

.column-row {
  transition: background 0.2s;
}

.column-row:hover {
  background: #2d2d30;
}

.text-success {
  color: #10b981;
}

.text-error {
  color: #ef4444;
}

.text-muted {
  color: #858585;
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.badge.primary {
  background: #3b82f6;
  color: white;
}

.badge.foreign {
  background: #8b5cf6;
  color: white;
}
</style>
