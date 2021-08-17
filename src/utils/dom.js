/* istanbul ignore next */

import Vue from 'vue';

/* 关于$isServer ,里面很多是关于服务端渲染的，服务端或者IE通常没有addElementListener方法 等，通常拿这个属性作为判断 */
/* 什么是服务端渲染 ： https://ssr.vuejs.org/zh/#%E4%B8%BA%E4%BB%80%E4%B9%88%E4%BD%BF%E7%94%A8%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%AB%AF%E6%B8%B2%E6%9F%93-ssr-%EF%BC%9F*/
const isServer = Vue.prototype.$isServer;
const SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
const MOZ_HACK_REGEXP = /^moz([A-Z])/;
/*  document.documentMode 识别IE的版本号 */
/* 参考 https://www.w3cschool.cn/jsref/prop-doc-documentmode.html */
const ieVersion = isServer ? 0 : Number(document.documentMode);

/* istanbul ignore next */
/* 防止字符串出现\uFEFF,滤除 */
/* 参考 https://www.cnblogs.com/chongzi1990/p/8694883.html */
const trim = function(string) {
  return (string || '').replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
};

/* istanbul ignore next */
const camelCase = function(name) {
  return name.replace(SPECIAL_CHARS_REGEXP, function(_, separator, letter, offset) {
    return offset ? letter.toUpperCase() : letter;
  }).replace(MOZ_HACK_REGEXP, 'Moz$1');
};

/* 绑定方法, 这里关于 addEventListener 和attachEvent ，
你需要了解什么是事件捕获，事件冒泡 以及IE9之前的浏览器不支持addEventListener*/
/**
 *   1.事件捕获和事件冒泡参考：https://www.w3cschool.cn/frontend_notebook/frontend_notebook-sjpd279s.html
 *   2.addEventListener语法参考：https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
 *   3.attachEvent参考https://www.cnblogs.com/theWayToAce/p/5308102.html
 **/
/** 如果了解过 Node.js的EventEmitter,理解 on off once 会更顺利 */
/* istanbul ignore next */
export const on = (function() {
  /** 排除服务端渲染 */
  if (!isServer && document.addEventListener) {
    /** notice: handler must be a function **/
    return function(element, event, handler) {
      if (element && event && handler) {
        element.addEventListener(event, handler, false);
      }
    };
  } else {
    return function(element, event, handler) {
      if (element && event && handler) {
        /** 适应 IE9以上 */
        element.attachEvent('on' + event, handler);
      }
    };
  }
})();

/* istanbul ignore next */
/**
 * @description 移除事件
 * @type {(function(*=, *=, *=): void)|(function(*=, *, *=): void)}
 */
export const off = (function() {
  if (!isServer && document.removeEventListener) {
    return function(element, event, handler) {
      if (element && event) {
        element.removeEventListener(event, handler, false);
      }
    };
  } else {
    return function(element, event, handler) {
      if (element && event) {
        element.detachEvent('on' + event, handler);
      }
    };
  }
})();

/* istanbul ignore next */
/**
 * @description 事件只生效一次，生效后被移除
 * @param el  元素
 * @param event  期望事件
 * @param fn  函数
 */
export const once = function(el, event, fn) {
  /** 也就是执行一次后马上调用off将事件从元素上移除 */
  var listener = function() {
    if (fn) {
      fn.apply(this, arguments);
    }
    off(el, event, listener);
  };
  on(el, event, listener);
};

/**  我觉得以下四个函数都是为了JSX中设置类名所设置的，很重要，对应的方法在Jquery也有,
 * 甚至可以说，直接是Jquery照着来的
 */

/* istanbul ignore next */
/**
 * @description 元素是否存在某个class
 * @param el 元素
 * @param cls 检测类名
 * @return {boolean}  返回true/false
 */
export function hasClass(el, cls) {
  if (!el || !cls) return false;
  /** 类名不能存在空格 */
  if (cls.indexOf(' ') !== -1) throw new Error('className should not contain space.');
  /** 类名一个或者多个 一个有涉及左右的空格 请记得考虑 */
  if (el.classList) {
    return el.classList.contains(cls);
  } else {
    return (' ' + el.className + ' ').indexOf(' ' + cls + ' ') > -1;
  }
};

/* istanbul ignore next */
/**
 * @description 增加类名
 * @param el --元素
 * @param cls --类名
 */
export function addClass(el, cls) {
  if (!el) return;
  var curClass = el.className;
  var classes = (cls || '').split(' ');

  for (var i = 0, j = classes.length; i < j; i++) {
    var clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.add(clsName);
    } else if (!hasClass(el, clsName)) {
      curClass += ' ' + clsName;
    }
  }
  if (!el.classList) {
    el.setAttribute('class', curClass);
  }
};

/* istanbul ignore next */
/**
 * @description 移除元素中的某个类名
 * @param el --元素
 * @param cls --要移除的类名
 */
export function removeClass(el, cls) {
  if (!el || !cls) return;
  var classes = cls.split(' ');
  var curClass = ' ' + el.className + ' ';

  for (var i = 0, j = classes.length; i < j; i++) {
    var clsName = classes[i];
    if (!clsName) continue;

    if (el.classList) {
      el.classList.remove(clsName);
    } else if (hasClass(el, clsName)) {
      curClass = curClass.replace(' ' + clsName + ' ', ' ');
    }
  }
  if (!el.classList) {
    el.setAttribute('class', trim(curClass));
  }
};

/* istanbul ignore next */
/**  zerotower: 为了更好地查看 对IE9以下版本的适配，我换行了
 * todo: 为了获取样式吧我想*
 * */
export const getStyle = ieVersion < 9
  /** 是IE9的是这个操作 */
  ? function(element, styleName) {
    /** 运行在服务器上,中止返回 */
    if (isServer) return;
    /** 参数非空 */
    if (!element || !styleName) return null;
    styleName = camelCase(styleName);
    if (styleName === 'float') {
      styleName = 'styleFloat';
    }
    try {
      switch (styleName) {
        case 'opacity':
          try {
            return element.filters.item('alpha').opacity / 100;
          } catch (e) {
            return 1.0;
          }
        default:
          return (element.style[styleName] || element.currentStyle ? element.currentStyle[styleName] : null);
      }
    } catch (e) {
      return element.style[styleName];
    }
  }
  : function(element, styleName) {
    if (isServer) return;
    if (!element || !styleName) return null;
    styleName = camelCase(styleName);
    if (styleName === 'float') {
      styleName = 'cssFloat';
    }
    try {
      var computed = document.defaultView.getComputedStyle(element, '');
      return element.style[styleName] || computed ? computed[styleName] : null;
    } catch (e) {
      return element.style[styleName];
    }
  };

/* istanbul ignore next */
/**
 * todo:need to learn
 * @description
 * @param element
 * @param styleName
 * @param value
 */
export function setStyle(element, styleName, value) {
  if (!element || !styleName) return;

  if (typeof styleName === 'object') {
    for (var prop in styleName) {
      if (styleName.hasOwnProperty(prop)) {
        setStyle(element, prop, styleName[prop]);
      }
    }
  } else {
    styleName = camelCase(styleName);
    if (styleName === 'opacity' && ieVersion < 9) {
      element.style.filter = isNaN(value) ? '' : 'alpha(opacity=' + value * 100 + ')';
    } else {
      element.style[styleName] = value;
    }
  }
};

/** @description 元素是否可以被滚动的 */
export const isScroll = (el, vertical) => {
  if (isServer) return;

  /** vertical 垂直滚动定义了吗 */
  const determinedDirection = vertical !== null && vertical !== undefined;
  /** vertical 非空就去 判断 vertical 为true还是为 false */
  const overflow = determinedDirection
    ? vertical
      ? getStyle(el, 'overflow-y')
      : getStyle(el, 'overflow-x')
    : getStyle(el, 'overflow');

  /** 关于overflow overflow-x,overflow-y 参考：https://developer.mozilla.org/en-US/docs/Web/CSS/overflow */
  return overflow.match(/(scroll|auto|overlay)/);
};

/** zerotower:获取能够滚动的包裹层
 * 大概的意思就是不停向上去判断可以滚动的最外层 container,最差找到了window对象(可以滚动的)
 * */

/**
 * @description 获取元素的最近滚动层
 * @param el
 * @param vertical
 * @return {(() => (Node | null))|ActiveX.IXMLDOMNode|(Node & ParentNode)|Window}
 */
export const getScrollContainer = (el, vertical) => {
  if (isServer) return;

  let parent = el;
  while (parent) {
    if ([window, document, document.documentElement].includes(parent)) {
      return window;
    }
    if (isScroll(parent, vertical)) {
      return parent;
    }
    /** DOM tree parent */
    parent = parent.parentNode;
  }

  return parent;
};

/**
 * todo:
 * @description 某个元素在某个元素的包裹中？？？
 * @param el
 * @param container
 * @return {boolean}
 */
export const isInContainer = (el, container) => {
  if (isServer || !el || !container) return false;

  const elRect = el.getBoundingClientRect();
  let containerRect;

  if ([window, document, document.documentElement, null, undefined].includes(container)) {
    containerRect = {
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      left: 0
    };
  } else {
    containerRect = container.getBoundingClientRect();
  }

  return elRect.top < containerRect.bottom &&
    elRect.bottom > containerRect.top &&
    elRect.right > containerRect.left &&
    elRect.left < containerRect.right;
};
