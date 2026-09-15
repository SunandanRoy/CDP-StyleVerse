// Minimal pub/sub toast bus — no provider nesting needed, any module can
// call toast.success(...)/toast.error(...)/toast.info(...) and ToastHost
// (mounted once in App.jsx) renders the stack.
let listeners = []
let counter = 0

function emit(entry) {
  listeners.forEach((fn) => fn(entry))
}

export function subscribeToast(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

function show(message, { type = 'info', duration = 3800 } = {}) {
  counter += 1
  emit({ id: counter, message, type, duration })
}

export const toast = {
  show,
  success: (message, opts) => show(message, { ...opts, type: 'success' }),
  error: (message, opts) => show(message, { ...opts, type: 'error', duration: opts?.duration ?? 5000 }),
  info: (message, opts) => show(message, { ...opts, type: 'info' })
}
