(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.redom = global.redom || {})));
}(this, (function (exports) { 'use strict';

var text = function (str) { return doc.createTextNode(str); };

var hookNames = ['onmount', 'onunmount'];

function mount (parent, child, before) {
  var parentEl = parent.el || parent;
  var childEl = child.el || child;

  if (isList(childEl)) {
    childEl = childEl.el;
  }

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  if (child !== childEl) {
    childEl.__redom_view = child;
  }

  var wasMounted = childEl.__redom_mounted;
  var oldParent = childEl.parentNode;

  if (wasMounted && (oldParent !== parentEl)) {
    doUnmount(child, childEl, oldParent);
  }

  if (before) {
    parentEl.insertBefore(childEl, before.el || before);
  } else {
    parentEl.appendChild(childEl);
  }

  doMount(child, childEl, parentEl, oldParent);

  return child;
}

function unmount (parent, child) {
  var parentEl = parent.el || parent;
  var childEl = child.el || child;

  if (child === childEl && childEl.__redom_view) {
    // try to look up the view if not provided
    child = childEl.__redom_view;
  }

  doUnmount(child, childEl, parentEl);

  parentEl.removeChild(childEl);

  return child;
}

function doMount (child, childEl, parentEl, oldParent) {
  var hooks = childEl.__redom_lifecycle || (childEl.__redom_lifecycle = {});
  var remount = (parentEl === oldParent);
  var hooksFound = false;

  if (child !== childEl) {
    for (var i = 0; i < hookNames.length; i++) {
      var hookName = hookNames[i];

      if (!remount && (hookName in child)) {
        hooks[hookName] = (hooks[hookName] || 0) + 1;
      }
      if (hooks[hookName]) {
        hooksFound = true;
      }
    }
  }

  if (!hooksFound) {
    return;
  }

  var traverse = parentEl;
  var triggered = false;

  if (remount || (!triggered && (traverse && traverse.__redom_mounted))) {
    trigger(childEl, remount ? 'onremount' : 'onmount');
    triggered = true;
  }

  if (remount) {
    return;
  }

  while (traverse) {
    var parent = traverse.parentNode;
    var parentHooks = traverse.__redom_lifecycle || (traverse.__redom_lifecycle = {});

    for (var hook in hooks) {
      parentHooks[hook] = (parentHooks[hook] || 0) + hooks[hook];
    }

    if (!triggered && (traverse === document || (parent && parent.__redom_mounted))) {
      trigger(traverse, remount ? 'onremount' : 'onmount');
      triggered = true;
    }

    traverse = parent;
  }
}

function doUnmount (child, childEl, parentEl) {
  var hooks = childEl.__redom_lifecycle;

  if (!hooks) {
    return;
  }

  var traverse = parentEl;

  if (childEl.__redom_mounted) {
    trigger(childEl, 'onunmount');
  }

  while (traverse) {
    var parentHooks = traverse.__redom_lifecycle;
    var hooksFound = false;

    if (hooks) {
      for (var hook in hooks) {
        if (parentHooks[hook]) {
          parentHooks[hook] -= hooks[hook];
        }
        if (parentHooks[hook]) {
          hooksFound = true;
        }
      }
    }

    if (!hooksFound) {
      traverse.__redom_lifecycle = null;
    }

    traverse = traverse.parentNode;
  }
}

function trigger (childEl, eventName) {
  var children = [childEl];

  while (children && children.length) {
    var newChildren = [];

    for (var i = 0; i < children.length; i++) {
      var childEl$1 = children[i];

      if (eventName === 'onmount') {
        childEl$1.__redom_mounted = true;
      } else if (eventName === 'onunmount') {
        childEl$1.__redom_mounted = false;
      }

      var hooks = childEl$1.__redom_lifecycle;

      if (!hooks) {
        continue;
      }

      var view = childEl$1.__redom_view;
      var hookCount = 0;

      view && view[eventName] && view[eventName]();

      for (var hook in hooks) {
        if (hook) {
          hookCount++;
        }
      }

      if (!hookCount) {
        continue;
      }

      var grandChildren = childEl$1.childNodes;

      for (var i$1 = 0; i$1 < grandChildren.length; i$1++) {
        newChildren.push(grandChildren[i$1]);
      }
    }

    children = newChildren;
  }
}

function setStyle (view, arg1, arg2) {
  var el = view.el || view;

  if (arguments.length > 2) {
    el.style[arg1] = arg2;
  } else if (isString(arg1)) {
    el.setAttribute('style', arg1);
  } else {
    for (var key in arg1) {
      setStyle(el, key, arg1[key]);
    }
  }
}

function setAttr (view, arg1, arg2) {
  var el = view.el || view;
  var isSVG = el instanceof window.SVGElement;

  if (arguments.length > 2) {
    if (arg1 === 'style') {
      setStyle(el, arg2);
    } else if (isSVG && isFunction(arg2)) {
      el[arg1] = arg2;
    } else if (!isSVG && (arg1 in el || isFunction(arg2))) {
      el[arg1] = arg2;
    } else {
      el.setAttribute(arg1, arg2);
    }
  } else {
    for (var key in arg1) {
      setAttr(el, key, arg1[key]);
    }
  }
}

function parseArguments (element, args) {
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];

    if (!arg) {
      continue;
    }

    // support middleware
    if (typeof arg === 'function') {
      arg(element);
    } else if (isString(arg) || isNumber(arg)) {
      element.appendChild(text(arg));
    } else if (isNode(arg) || isNode(arg.el) || isList(arg.el)) {
      mount(element, arg);
    } else if (arg.length) {
      parseArguments(element, arg);
    } else if (typeof arg === 'object') {
      setAttr(element, arg);
    }
  }
}

var isString = function (a) { return typeof a === 'string'; };
var isNumber = function (a) { return typeof a === 'number'; };
var isFunction = function (a) { return typeof a === 'function'; };

var isNode = function (a) { return a && a.nodeType; };
var isList = function (a) { return a && a.__redom_list; };

var doc = document;

var HASH = '#'.charCodeAt(0);
var DOT = '.'.charCodeAt(0);

function createElement (query, ns) {
  var tag;
  var id;
  var className;

  var mode = 0;
  var start = 0;

  for (var i = 0; i <= query.length; i++) {
    var char = query.charCodeAt(i);

    if (char === HASH || char === DOT || !char) {
      if (mode === 0) {
        if (i === 0) {
          tag = 'div';
        } else if (!char) {
          tag = query;
        } else {
          tag = query.substring(start, i);
        }
      } else {
        var slice = query.substring(start, i);

        if (mode === 1) {
          id = slice;
        } else if (className) {
          className += ' ' + slice;
        } else {
          className = slice;
        }
      }

      start = i + 1;

      if (char === HASH) {
        mode = 1;
      } else {
        mode = 2;
      }
    }
  }

  var element = ns ? doc.createElementNS(ns, tag) : doc.createElement(tag);

  if (id) {
    element.id = id;
  }

  if (className) {
    if (ns) {
      element.setAttribute('class', className);
    } else {
      element.className = className;
    }
  }

  return element;
}

var htmlCache = {};

var memoizeHTML = function (query) { return htmlCache[query] || createElement(query); };

function html (query) {
  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

  var element;

  if (isString(query)) {
    element = memoizeHTML(query).cloneNode(false);
  } else if (isNode(query)) {
    element = query.cloneNode(false);
  } else {
    throw new Error('At least one argument required');
  }

  parseArguments(element, args);

  return element;
}

html.extend = function (query) {
  var clone = memoizeHTML(query);

  return html.bind(this, clone);
};

var el = html;

function setChildren (parent, children) {
  if (children.length === undefined) {
    return setChildren(parent, [children]);
  }

  var parentEl = parent.el || parent;
  var traverse = parentEl.firstChild;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];

    if (!child) {
      continue;
    }

    var childEl = child.el || child;

    if (isList(childEl)) {
      childEl = childEl.el;
    }

    if (childEl === traverse) {
      traverse = traverse.nextSibling;
      continue;
    }

    mount(parent, child, traverse);
  }

  while (traverse) {
    var next = traverse.nextSibling;

    unmount(parent, traverse);

    traverse = next;
  }
}

function list (parent, View, key, initData) {
  return new List(parent, View, key, initData);
}

function List (parent, View, key, initData) {
  this.__redom_list = true;
  this.View = View;
  this.key = key;
  this.initData = initData;
  this.views = [];
  this.el = getParentEl(parent);

  if (key) {
    this.lookup = {};
  }
}

List.extend = function (parent, View, key, initData) {
  return List.bind(List, parent, View, key, initData);
};

list.extend = List.extend;

List.prototype.update = function (data) {
  if ( data === void 0 ) data = [];

  var View = this.View;
  var key = this.key;
  var functionKey = isFunction(key);
  var initData = this.initData;
  var newViews = new Array(data.length);
  var oldViews = this.views;
  var newLookup = key && {};
  var oldLookup = key && this.lookup;

  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    var view = (void 0);

    if (key) {
      var id = functionKey ? key(item) : item[key];
      view = newViews[i] = oldLookup[id] || new View(initData, item, i, data);
      newLookup[id] = view;
      view.__id = id;
    } else {
      view = newViews[i] = oldViews[i] || new View(initData, item, i, data);
    }
    var el$$1 = view.el;
    if (el$$1.__redom_list) {
      el$$1 = el$$1.el;
    }
    el$$1.__redom_view = view;
    view.update && view.update(item, i, data);
  }

  setChildren(this, newViews);

  if (key) {
    this.lookup = newLookup;
  }
  this.views = newViews;
};

function getParentEl (parent) {
  if (isString(parent)) {
    return html(parent);
  } else if (isNode(parent.el)) {
    return parent.el;
  } else {
    return parent;
  }
}

function router (parent, Views, initData) {
  return new Router(parent, Views, initData);
}

var Router = function Router (parent, Views, initData) {
  this.el = getParentEl(parent);
  this.Views = Views;
  this.initData = initData;
};
Router.prototype.update = function update (route, data) {
  if (route !== this.route) {
    var Views = this.Views;
    var View = Views[route];

    this.view = View && new View(this.initData, data);
    this.route = route;

    setChildren(this.el, [ this.view ]);
  }
  this.view && this.view.update && this.view.update(data, route);
};

var SVG = 'http://www.w3.org/2000/svg';

var svgCache = {};

var memoizeSVG = function (query) { return svgCache[query] || createElement(query, SVG); };

function svg (query) {
  var args = [], len = arguments.length - 1;
  while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

  var element;

  if (isString(query)) {
    element = memoizeSVG(query).cloneNode(false);
  } else if (isNode(query)) {
    element = query.cloneNode(false);
  } else {
    throw new Error('At least one argument required');
  }

  parseArguments(element, args);

  return element;
}

svg.extend = function (query) {
  var clone = memoizeSVG(query);

  return svg.bind(this, clone);
};

exports.html = html;
exports.el = el;
exports.list = list;
exports.List = List;
exports.mount = mount;
exports.unmount = unmount;
exports.router = router;
exports.Router = Router;
exports.setAttr = setAttr;
exports.setStyle = setStyle;
exports.setChildren = setChildren;
exports.svg = svg;
exports.text = text;

Object.defineProperty(exports, '__esModule', { value: true });

})));
