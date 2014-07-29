/*global browser:true, define:false */
define([
		"troopjs-dom/component/widget",
		"troopjs-opt/store/component",
		"troopjs-contrib-browser/store/adapter/local",
		"jquery",
		"template!./item.html",
		"poly/array"
	],
	function ListModule(Widget, Store, Adapter, $, template) {
		"use strict";

		var ENTER_KEY = 13;
		var ESC_KEY = 27;
		var FILTER_ACTIVE = "filter-active";
		var FILTER_COMPLETED = "filter-completed";
		var KEY = "todos-troopjs";
		var STORE = "store";

		function filter(item) {
			return item !== null;
		}

		return Widget.extend(function ListWidget() {
			this[STORE] = Store(Adapter());
		}, {
			"sig/start": function() {
				var me = this;
				var store = me[STORE];
				return store.lock(KEY).then(function() {
					return store.get(KEY).spread(function(items) {
						return store.put(KEY, items && items.filter(filter) || []).then(function(items) {
							items.forEach(function(item, i) {
								me.append(template, {
									"i": i,
									"item": item
								});
							});
							me.publish("todos/change", items);
						});
					});
				});
			},

			"hub/todos/add": function onAdd(title) {
				var me = this;
				var store = me[STORE];

				return store.lock(KEY).then(function() {
					return store.get(KEY).spread(function(items) {
						var i = items.length;

						var item = items[i] = {
							"completed": false,
							"title": title
						};

						me.append(template, {
							"i": i,
							"item": item
						});

						return store.put(KEY, items).then(function(items) {
							me.publish("todos/change", items);
						});
					});
				});
			},

			"hub/todos/mark": function onMark(value) {
				this.$element.find(":checkbox").prop("checked", value).change();
			},

			"hub/todos/clear": function onClear() {
				this.$element.find(".completed .destroy").click();
			},

			"hub:memory/todos/filter": function onFilter(filter) {
				var $element = this.$element;
				switch (filter) {
					case "completed":
						$element
							.removeClass(FILTER_ACTIVE)
							.addClass(FILTER_COMPLETED);
						break;

					case "active":
						$element
							.removeClass(FILTER_COMPLETED)
							.addClass(FILTER_ACTIVE);
						break;

					default:
						$element.removeClass([FILTER_ACTIVE, FILTER_COMPLETED].join(" "));
				}
			},

			"dom:.toggle/change": function onToggleChange($event) {
				var me = this;
				var store = me[STORE];
				var $target = $($event.target);
				var completed = $target.prop("checked");
				var $li = $target.closest("li");

				$li
					.toggleClass("completed", completed)
					.toggleClass("active", !completed);

				store.lock(KEY).then(function() {
					return store.get(KEY).spread(function(items) {
						var index = $li.data("index");
						items[index].completed = completed;
						return store.put(KEY, items).then(function(items) {
							me.publish("todos/change", items);
						});
					});
				});
			},

			"dom:.destroy/click": function onDestroyClick($event) {
				var me = this;
				var store = me[STORE];
				var $li = $($event.target).closest("li");
				$li.remove();
				store.lock(KEY).then(function() {
					return store.get(KEY).spread(function(items) {
						var index = $li.data("index");
						items[index] = null;
						return store.put(KEY, items).then(function(items) {
							me.publish("todos/change", items);
						});
					});
				});
			},

			"dom:.view label/dblclick": function onViewDblClick($event) {
				var me = this;
				var store = me[STORE];
				var $li = $($event.target).closest("li");
				var $input = $li.find("input");

				$li.addClass("editing");
				$input.prop("disabled", true);

				store.lock(KEY).then(function() {
					return store.get(KEY).spread(function(items) {
						var index = $li.data("index");
						$input
							.val(items[index].title)
							.prop("disabled", false)
							.focus();
					});
				}).otherwise(function() {
					$input.prop("disabled", false);
					$li.addClass("editing");
				});
			},

			"dom:.edit/keyup": function onEditKeyUp($event) {
				var $li = $($event.target).closest("li");

				switch ($event.keyCode) {
					case ENTER_KEY :
						$li
							.find("input")
							.focusout();
						break;

					case ESC_KEY :
						$li
							.find("input")
							.val($li.find("label").text())
							.focusout();
						break;
				}
			},

			"dom:.edit/focusout": function onEditFocusOut($event) {
				var me = this;
				var store = me[STORE];
				var $target = $($event.target);
				var title = $target.val().trim();
				if (title === "") {
					$target
						.closest("li.editing")
						.removeClass("editing")
						.find(".destroy")
						.click();
				}
				else {
					$target.prop("disabled", true);
					store.lock(KEY).then(function() {
						store.get(KEY).spread(function(items) {
							var index = $target.closest("li.editing").data('index');
							var item = items[index];
							if (item) {
								item.title = title;
								return store.put(KEY, items).ensure(function() {
									$target.closest("li.editing").removeClass("editing").find('label').text(title);
									me.publish("todos/change", items);
								});
							}
						});
					});
				}
			}
		});
	});
