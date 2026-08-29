/** Minimal DOM helpers  keeps the engine terse without a framework. */

type Child = Node | string | null | undefined | false
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>

/** Create an element with attributes/handlers/children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue
      if (key === 'class') node.className = String(value)
      else if (key === 'html') node.innerHTML = String(value)
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value)
      } else if (value === true) node.setAttribute(key, '')
      else node.setAttribute(key, String(value))
    }
  }
  append(node, ...children)
  return node
}

/** Append children (strings become text nodes; falsy is skipped). */
export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
  }
}

/** Remove all children of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild)
}

/** Add a listener and return a disposer. */
export function on<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler as EventListener, options)
  return () => target.removeEventListener(event, handler as EventListener, options)
}

/** Toggle a class based on a boolean. */
export function toggleClass(node: Element, className: string, active: boolean): void {
  node.classList.toggle(className, active)
}
