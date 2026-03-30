<template>
  <button
    v-bind="$attrs"
    v-for="btn in buttons"
    :key="btn.value"
    :disabled="modelValue === btn.value"
    @click="updateValue(btn.value)"
  >
    {{ btn.label }}
  </button>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  buttons: {
    type: Array,
    required: true
  },
})

const active = ref(props.modelValue)
const emit = defineEmits(['update:modelValue'])
function updateValue(value) {
  active.value = value
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}
</script>
