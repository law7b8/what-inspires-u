const PREFIX = '[wiy]'
let enabled = true

export function disable() {
  enabled = false
}

export function enable() {
  enabled = true
}

export function log(...args) {
  if (enabled) console.log(PREFIX, ...args)
}

export function warn(...args) {
  if (enabled) console.warn(PREFIX, ...args)
}

export function error(...args) {
  if (enabled) console.error(PREFIX, ...args)
}

export default { log, warn, error, enable, disable }
