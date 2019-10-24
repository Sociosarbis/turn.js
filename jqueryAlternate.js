function isElement(el) {
  return el instanceof HTMLElement || el === document
}

function isJq(el) {
  return el instanceof JqueryAlternate
}

function isArrayLike(list) {
  return list && ('length' in list)
}

function isNumber(num) {
  return typeof num === 'number' && !isNaN(num)
}

class JqueryAlternate {
  constructor(element, options) {
    this.length = 0
    if (typeof element === 'string') {
      try {
        this.push(...document.querySelectorAll(element))
      } catch (e) {
        try {
          this.push(...$.parseHTML(element))
        } catch (e) {
          const el = document.createElement('span')
          el.textContent = element
          this.push(el)
        }
      }
    } else if (isElement(element)) {
      this.push(element)
    } else if (isArrayLike(element)) {
      this.push(...element)
    }
    const cleanedArr = Array.from(new Set(this)).filter(isElement)
    this.clear()
    this.push(...cleanedArr)
    if (options) {
      this._setAttrs(options)
    }
    this._initEventMap()
  }

  _initEventMap() {
    this.forEach((ele) => {
      if (ele._$eventMap) return
      ele._$eventMap = Object.create(null)
    })
  }

  _mapElement(callback) {
    return this.map(callback)
  }

  _first() {
    return this[0]
  }

  clear() {
    this.splice(0, this.length)
  }

  _addEvent(ele, eventName, handler) {
    if (!(eventName in ele._$eventMap)) ele._$eventMap[eventName] = []
    ele._$eventMap[eventName].push(handler)
    return this
  }

  _setAttrs(attrs) {
    this._mapElement((ele) => {
      Object.keys(attrs).forEach(key => {
        switch (key) {
          case 'css':
            Object.keys(attrs[key]).forEach(name => {
              ele.style[name] = this.intToPx(attrs[key][name])
            })
            break
          default:
            ele.setAttribute(key, attrs[key])
        }
      })
    })
    return this
  }

  data(...args) {
    if (args.length) {
      return this._setData(args[0])
    } else return this._getData()
  }

  _setData(value) {
    this._mapElement((ele) => {
      ele._$data = value
    })
    return this
  }

  _getData() {
    if (!this.length) return null
    let data = this._first()._$data
    if (!data) {
      data = {}
      this._first()._$data = data
    }
    return data
  }

  append(obj) {
    if (!this.length) return this
    if (isJq(obj)) {
      this._first().appendChild(...obj._mapElement(el => el))
    } else {
      this._first().appendChild(...new JqueryAlternate(obj)._mapElement(el => el))
    }
    return this
  }

  appendTo(obj) {
    if (isElement(obj)) {
      this._mapElement((el) => {
        obj.appendChild(el)
      })
    }
    else if (isJq(obj)) {
      obj.append(this)
    }
    return this
  }

  prepend(obj) {
    if (!this.length) return this
    if (isJq(obj)) {
      this._first().prepend(...obj._mapElement(el => el))
    } else {
      this._first().prepend(...new JqueryAlternate(obj)._mapElement(el => el))
    }
    return this
  }

  parent() {
    return new JqueryAlternate(Array.from(new Set(Array.from(this._mapElement((ele) => ele.parentElement)))))
  }


  remove() {
    this._mapElement(el => el.remove())
    return this
  }

  is(selector) {
    switch (selector) {
      case ':visible':
        const firstEl = this._first()
        return Boolean(firstEl && firstEl.clientWidth && firstEl.clientHeight)
      default:
        return true
    }
  }

  children(selector) {
    if (selector) {
      return new JqueryAlternate(this._mapElement((ele) => {
        const parent = ele.parentElement
        const children = Array.from(parent.children)
        const index = children.indexOf(ele)
        return Array.from(ele.querySelectorAll(`:nth-child(${index + 1})>${selector}`))
      }).reduce((acc, sub) => acc.concat(sub), []))
    } else {
      return new JqueryAlternate(this._mapElement((ele) => ele.children).reduce((acc, sub) => {
        acc.push(...sub)
        return acc
      }, []))
    }
  }

  intToPx(value) {
    return !isNumber(value) ? value : `${value}px`
  }

  pxToInt(value) {
    return /px$/.test(value) || isNumber(value) ? parseFloat(value) : value
  }

  css(styles) {
    if (!this.length) return
    if (typeof styles === 'object') return this._setAttrs({ css: styles })
    return this.pxToInt(this._first().style[styles])
  }

  height(...args) {
    if (args.length) {
      this._setStyle('height', this.intToPx(args[0]))
    } else return parseFloat(this._getStyle('height'))
  }

  hide() {
    return this.css({ display: 'none' })
  }

  show() {
    return this.css({ display: 'block' })
  }

  width(...args) {
    if (args.length) {
      this._setStyle('width', this.intToPx(args[0]))
    } else return parseFloat(this._getStyle('width'))
  }

  _setStyle(name, value) {
    this._mapElement((ele) => ele.style[name] = value)
    return this
  }

  _getStyle(name) {
    if (!this.length) return ''
    return window.getComputedStyle(this._first())[name]
  }

  bind(eventName, handler) {
    const onEvent = `on${eventName.toLowerCase()}`
    this._mapElement((ele) => {
      if (onEvent in ele) {
        ele.addEventListener(eventName, (e) => {
          const jqEvent = new JqueryEvent(eventName)
          jqEvent.fromNativeEvent(e)
          handler(jqEvent)
        })
      } else this._addEvent(ele, eventName, handler)
    })
    return this
  }

  trigger(eventName, ...args) {
    let _event = eventName
    this._mapElement((ele) => {
      let cur = ele
      let _$event = typeof eventName === 'string' ? new JqueryEvent(eventName) : _event
      while (!_$event.isPropagationStopped() && cur) {
        const eventMap = cur._$eventMap
        if (eventMap && eventMap[_$event.type]) {
          let _args = args
          if (args.length === 1) _args = [...args[0]]
          eventMap[_$event.type].forEach(handler => handler.call(cur, _$event, ..._args))
        }
        cur = cur.parentElement
      }
    })
    return this
  }

  addClass(className) {
    const clses = className.split(' ').map((str) => str.trim())
    this._mapElement((ele) => {
      ele.classList.add(...clses)
    })
    return this
  }

  removeClass(className) {
    const clses = className.split(' ').map((str) => str.trim())
    this._mapElement((ele) => {
      ele.classList.remove(...clses)
    })
    return this
  }

  offset() {
    const first = this._first()
    let top = 0
    let left = 0
    if (first) {
      const world = document.body.getBoundingClientRect()
      const obj = first.getBoundingClientRect()
      top = obj.top - world.top
      left = obj.left - world.left
    }
    return {
      top,
      left
    }
  }

  static fn() {
    return JqueryAlternate.prototype
  }

}

function $(...args) {
  return new JqueryAlternate(...args)
}

class JqueryEvent {
  constructor(type) {
    this.type = type
    this._defaultPrevented = false
    this._propagationStopped = false
  }

  isDefaultPrevented() {
    return this._defaultPrevented
  }

  fromNativeEvent(e) {
    const { target, currentTarget, touches, pageX, pageY } = e
    Object.assign(this, {
      target,
      currentTarget,
      touches,
      pageX,
      pageY
    },
      {
        originalEvent: e
      }
    )
  }

  preventDefault() {
    this._defaultPrevented = true
  }

  isPropagationStopped() {
    return this._propagationStopped
  }

  stopPropagation() {
    this._propagationStopped = true
  }
}

Object.assign($, {
  extend(...args) {
    return Object.assign(...args)
  },
  parseHTML(str) {
    const div = document.createElement('div')
    div.innerHTML = str
    return div.children
  }, inArray(value, arr) {
    return arr.indexOf(value)
  },
  fn: JqueryAlternate.prototype,
  Event(...args) {
    return new JqueryEvent(...args)
  }
})

const { push, splice, forEach, map, values } = Array.prototype
Object.assign($.fn, {
  push,
  splice,
  forEach,
  map,
  [Symbol.iterator]: values
})

export default $