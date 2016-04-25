/**
 * @author zman
 * @date 2016-4-25
 */
(function (global, factory) {
	if (typeof module === "object" && typeof module.exports === "object") {
		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ? factory(global, true) : function (w) {
			if (!w.document) {
				throw new Error("smoothScroll requires a window with a document");
			}
			if (!w.jQuery) {
				throw new Error('smoothScroll requires a window with a Jquery');
			}
			return factory(w);
		};
	} else {
		factory(global);
	}

	// Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function (window, noGlobal) {
	'use strict';
	/*
	 * https://github.com/oblador/angular-scroll (duScrollDefaultEasing)
	 * 0-1
	 */
	var easing = function (x) {
		if (x < 0.5) {
			return Math.pow(x * 2, 2) / 2;
		}
		return 1 - Math.pow((1 - x) * 2, 2) / 2;
	};
	var bind = function (fn, scope) {
		return function () {
			fn.apply(scope, arguments);
		}
	};
	var $ = window.jQuery;
	/*
	 * Wraps window properties to allow server side rendering
	 */
	var currentWindowProperties = function () {
		if (typeof window !== 'undefined') {
			return window.requestAnimationFrame || window.webkitRequestAnimationFrame;
		}
	};

	/*
	 * Helper function to never extend 60fps on the webpage.
	 */
	var requestAnimationFrameHelper = (function () {
		return currentWindowProperties() ||
			function (callback, element, delay) {
				return window.setTimeout(callback, delay || (1000 / 60), Date.now());
			};
	})();

	function Animate($el, options) {
		if (!$el.length) {
			throw 'jQuery object is undefined';
		}
		this.$el = $el;
		this.__target = this.$el;
		this.init(options);
	}

	Animate.prototype = {
		__duration: 200,
		__stoped: false,
		__scrolling: false,
		__dir: 'y',
		__target: null,
		__delta: 0,
		__frames: [],
		__callback: null,
		init: function (options) {
			this.__dir = options.dir || 'y';
			!isNaN(parseFloat(options.duration)) && (this.__duration = parseFloat(options.duration));
			this.__callback = options.callback;
		},
		callback: function () {
			this.__scrolling = false;
			this.__frames = [];
			this.__callback && this.__callback();
			this.__target.trigger('scrollEnd');
		},
		step: function (timestamp) {
			if (!this.__target.parent().length) {//dom is destroyed
				this.stop();
			}
			if (this.__stoped) {
				return
			}
			this.__scrolling = true;
			var now = Date.now();
			var que = this.__frames;
			var duration = this.__duration;
			var scroll = 0,
				scrollX = this.__target.scrollLeft(),
				scrollY = this.__target.scrollTop();
			var delta, item, finished, elapsed, position;
			var scrollWindow = (this.__target[0] === document.body);
			for (var i = 0; i < que.length; i++) {
				item = que[i];
				elapsed = now - item.start;
				finished = (elapsed >= duration);

				// scroll position: [0, 1]
				position = easing((finished) ? 1 : elapsed / duration);

				// only need the difference
				delta = (item.delta * position - item.last) >> 0;

				// add this to the total scrolling
				scroll += delta;

				// update last values
				item.last += delta;

				// delete and step back if it's over
				if (finished) {
					que.splice(i, 1);
					i--;
				}
			}

			if (window.devicePixelRatio) {
				//scrollX /= (window.devicePixelRatio;
				//scrollY /= window.devicePixelRatio;
			}
			if (this.__dir === 'x') {
				scrollX = scroll;
			}
			else {
				scrollY = scroll;
			}
			// scroll left and top
			if (scrollWindow) {
				window.scrollBy(scrollX, scrollY);
			} else {
				if (this.__dir === 'x') {
					this.__target[0].scrollLeft += scrollX;
				}
				else {
					this.__target[0].scrollTop += scrollY;
				}
			}
			if (que.length) {
				requestAnimationFrameHelper.call(window, bind(this.step, this));
			} else {
				this.callback();
			}
		},
		pushFrame: function (options) {
			this.__frames.push({
				last: (options.delta < 0) ? 0.99 : -0.99,
				delta: options.delta,
				start: Date.now()
			});
		},
		update: function (options) {
			this.init(options);
		},
		start: function () {
			this.__stoped = false;
			this.__scrolling = false;
			requestAnimationFrameHelper.call(window, bind(this.step, this));
		},
		scrolling: function () {
			return this.__scrolling;
		},
		stop: function () {
			if (this.scrolling()) {
				this.__stoped = true;
				this.__scrolling = false;
				this.__frames = [];
			}
			return this;
		}
	};
	function doScroll($el, options) {
		var animate = $el.data('zSmoothScroll-' + options.dir);
		if (animate) {
			animate.update(options);
		} else {
			animate = new Animate($el, options);
		}
		animate.pushFrame(options);
		if (!animate.scrolling()) {
			animate.start();
		}
		$el.data('zSmoothScroll-' + options.dir, animate);
	}

	/**
	 * example
	 * $('#test').zSmoothScroll({delta:120,dir:'y'})
	 *
	 * options = {delta:120,duration:200,dir:'y',callback:function(){}}
	 * dir is direction,y : scrollTop,x :scrollLeft
	 * callback via on animate finished
	 * @param options
	 */
	$.fn.zSmoothScroll = function (options) {
		this.each(function () {
			doScroll($(this), options);
		});
	}
});