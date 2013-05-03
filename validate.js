(function($, undefined) {

	'use strict';

	var

		// The plugin name.
		name = 'validate',

		// Empty function.
		noop = $.noop,

		// Default properties.
		defaults = {
			// A function called when the form is valid.
			valid : noop,

			// A function called when the form is invalid.
			invalid : noop,

			// A function called before validate form.
			beforeValidate : noop,

			// A function called after validate form.
			afterValidate : noop,

			// A function called for each invalid field.
			eachInvalidField : noop,

			// A function called for each valid field.
			eachValidField : noop,

			// A function called for each field.
			eachField : noop,

			// 
			filter : '*',

			// 
			events : [],

			// 
			selectFirstInvalid : true,

			// 
			sendForm : true,

			// 
			conditional : {},

			// 
			prepare : {},

			//
			valueHook : null,

			// 
			description : {},

			// 
			clause : null
		},

		writable = 'input:not([type]),input[type=color],input[type=date],input[type=datetime],input[type=datetime-local],input[type=email],input[type=file],input[type=hidden],input[type=month],input[type=number],input[type=password],input[type=range],input[type=search],input[type=tel],input[type=text],input[type=time],input[type=url],input[type=week],textarea,select',

		checkable = 'input[type=checkbox],input[type=radio]',

		// Fields selector.
		types = writable + ',' + checkable,

		// Extensions.
		validate = {},

		// 
		regExpTrue = /^(true|1|)$/i,

		// 
		regExpFalse = /^(false|0)$/i,

		// 
		getParentAttribute = function(element, attribute) {

			return $(element).parents('*').filter(function() {

				return $(this).data(attribute) !== undefined;
			}).filter(':first').data(attribute);
		},

		// 
		ifExist = function(value, substitute) {

			return !/^(undefined|null|NaN)$/.test(value) ? value : substitute;
		},

		// 
		namespace = function(events) {

			return events.replace(/(\s+|$)/g, '.' + name + '$1');
		},

		// A function to validate fields.
		validateField = function(options, event, callbacks) {

			var

				// Current field.
				element = $(this),

				// Current field data.
				data = element.data(),

				// 
				fieldValidate = data.validate,

				// 
				currentValidation = validate[fieldValidate] || {},

				// A conditional function.
				fieldConditional = ifExist(data.conditional, currentValidation.conditional),

				// A field id to confirm.
				fieldConfirm = String(ifExist(data.confirm, currentValidation.confirm)),

				// 
				fieldIgnorecase = regExpFalse.test(getParentAttribute(element, 'ignorecase')) ? false : true,

				// A mask to field value.
				fieldMask = data.mask || currentValidation.mask,

				// 
				fieldMaxlength = ifExist(Number(data.maxlength), currentValidation.maxlength) || Infinity,

				// 
				fieldMinlength = ifExist(Number(data.minlength), currentValidation.minlength) || 0,

				// A regular expression to validate the field value.
				fieldPattern = ifExist(data.pattern, currentValidation.pattern) || '',

				// 
				fieldPrepare = ifExist(data.prepare, currentValidation.pattern),

				// 
				fieldRequired = regExpTrue.test(ifExist(data.required, currentValidation.required)) || regExpTrue.test(getParentAttribute(element, 'required')),

				// 
				fieldTrim = regExpTrue.test(ifExist(data.trim, currentValidation.trim)) || regExpTrue.test(getParentAttribute(element, 'trim')),

				// 
				fieldDescription = ifExist(data.describedby, currentValidation.describedby),

				// Current field value.
				fieldValue = fieldTrim ? $.trim(element.val()) : element.val(),

				// 
				fieldLength = ifExist(fieldValue, '').length,

				// Current field name.
				fieldName = element.prop('name'),

				// 
				sameName = $('[name="' + fieldName + '"]'),

				// Current field status.
				status = {
					required : true,
					minlength : true,
					maxlength : true,
					pattern : true,
					confirm : true,
					conditional : true
				},

				// 
				valid = true,

				// 
				eventType = event ? event.type : null,

				// 
				patternModifier = fieldIgnorecase ? 'i' : undefined,

				// 
				filled;

			//
			if($.isFunction(options.valueHook)) {

				fieldValue = options.valueHook.call(element, fieldValue);
			}

			// 
			if($.isFunction(fieldPrepare)) {

				fieldValue = fieldPrepare.call(element, fieldValue);
			} else {

				var

					prepare = options.prepare[fieldPrepare];

				fieldValue = $.isFunction(prepare) ? prepare.call(element, fieldValue) : fieldValue;
			}

			// 
			fieldValue = String(fieldValue);

			// 
			if($.type(fieldPattern) === 'regex') {

				fieldPattern = new RegExp(fieldPattern.source, patternModifier);
			} else {

				fieldPattern = new RegExp(fieldPattern, patternModifier);
			}

			// 
			if(element.is(checkable)) {

				filled = fieldName.length > 0 ? sameName.filter(':checked').length > 0 : false;

				status.minlength = sameName.filter(':checked').length >= fieldMinlength;

				status.maxlength = sameName.filter(':checked').length <= fieldMaxlength;
			} else if(element.is(writable)) {

				filled = fieldLength > 0;

				status.minlength = fieldLength >= fieldMinlength;

				status.maxlength = fieldLength <= fieldMaxlength;

				status.pattern = fieldPattern.test(fieldValue);
			}

			// 
			if(fieldRequired) {

				status.required = filled;
			}

			// 
			if(callbacks && eventType !== 'keyup' && status.pattern && data.mask) {

				var

					parts = fieldValue.match(fieldPattern) || [],

					newValue = String(fieldMask);

				for(var currentPart = 0, sharesLength = parts.length; currentPart < sharesLength; currentPart++) {

					var

						part = parts[currentPart];

					newValue = newValue.replace(new RegExp('(^|[^\\\\])\\$\\{' + currentPart + '(?::`([^`]*)`)?\\}'), part ? '$1' + part.replace(/\$/g, '$$') : '$1$2');
				}

				newValue = newValue.replace(/(?:^|[^\\])\$\{\d+(?::`([^`]*)`)?\}/g, '$1');

				if(fieldPattern.test(newValue)) {

					element.val(newValue);
				}
			}

			// 
			if(fieldConfirm.length > 0) {

				var

					confirmation =  $('#' + fieldConfirm);

				if(confirmation.length > 0) {

					status.confirm = confirmation.val() === fieldValue;
				}
			}

			// 
			if($.isFunction(fieldConditional)) {

				status.conditional = !!fieldConditional.call(element, fieldValue);
			} else {

				var

					conditionals = $.type(fieldConditional) === 'array' ? fieldConditional : String(fieldConditional).split(/\s+/),

					validConditionals = true;

				for(var currentConditional = 0, conditionalLength = conditionals.length; currentConditional < conditionalLength; currentConditional++) {

					var

						conditional = options.conditional[conditionals[currentConditional]];

					if($.isFunction(conditional) && !options.conditional[conditionals[currentConditional]].call(element, fieldValue)) {

						validConditionals = false;
					}
				}

				status.conditional = validConditionals;
			}

			var

				description = $.isPlainObject(options.description) ? options.description : {},

				customDescription = $.isPlainObject(description.custom) ? description.custom : {},

				message,

				describe;

			customDescription = $.isPlainObject(customDescription[fieldDescription]) ? customDescription[fieldDescription] : {};

			var

				descriptionEvents = customDescription.events || description.events || [];

			descriptionEvents = $.isArray(descriptionEvents) ? descriptionEvents : String(descriptionEvents).split(/\s+/);

			// 
			descriptionEvents.push('submit');
console.log(descriptionEvents)
			// 
			for(var item in status) {

				if(!status[item]) {

					if($.isPlainObject(customDescription.error)) {

						message = customDescription.error[item] || customDescription.error.message;
					} else {

						message = $.isFunction(customDescription.error) ? customDescription.error.call(element, fieldValue) : customDescription.error;
					}

					if(!message) {

						if($.isPlainObject(description.error)) {

							message = description.error[item] || description.error.message;
						} else {

							message = $.isFunction(description.error) ? description.error.call(element, fieldValue) : description.error;
						}
					}

					message = $.isFunction(message) ? message.call(element, fieldValue) : message;

					valid = false;

					break;
				}
			}

			if(element.is('[id]')) {

				describe = $('*').filter(function() {

					return $(this).data('describe') === element.prop('id');
				});
			}

			if(describe !== undefined && $.inArray(eventType, descriptionEvents) > -1) {

				if(valid) {

					if(description.success) {

						if($.isFunction(description.success)) {

							describe.html(description.success.call(element, fieldValue));
						} else {

							describe.html(description.success);
						}
					}
				} else if(message) {

					describe.html(message);
				}
			}

			// 
			element.prop('aria-invalid', !valid);

			return {
				valid : valid,
				status : status
			};
		},

		// 
		methods = {
			destroy : function() {

				var

					// 
					element = $(this),

					// 
					fields = element.find(types);

				// 
				if(element.is('[id]')) {

					fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
				}

				// 
				element.add(fields.filter(element.data(name).filter)).removeData(name).off('.' + name);

				return element;
			},
			validate : function(event, callbacks) {

				var

					// Current form.
					element = $(this),

					// Current form data.
					data = element.data(name),

					// 
					fields = element.find(types),

					// 
					valid = true,

					// 
					first = true;

				if(callbacks && $.isFunction(data.beforeValidate)) {

					// 
					data.beforeValidate.call(element);
				}

				// 
				if(element.is('[id]')) {

					fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
				}

				// 
				fields.filter(data.filter).each(function() {

					var

						response = validateField.call(this, data, event, true),

						status = response.status;

					if(response.valid) {

						if(callbacks && $.isFunction(data.eachValidField)) {

							data.eachValidField.call(this);
						}
					} else {

						valid = false;

						if(callbacks) {

							if($.isFunction(data.eachInvalidField)) {

								data.eachInvalidField.call(this, status);
							}

							if(first && data.selectFirstInvalid) {

								$(this).trigger('select');

								first = false;
							}
						}
					}

					if(callbacks) {

						if($.isFunction(data.eachField)) {

							data.eachField.call(this, status);
						}
					}
				});

				// 
				if($.isFunction(data.clause)) {

					valid = !data.clause.call(element);
				}

				if(callbacks) {

					// 
					if(valid) {

						// 
						if(!data.sendForm && event) {

							event.preventDefault();
						}

						if($.isFunction(data.valid)) {

							// 
							data.valid.call(element);
						}

						// 
						element.triggerHandler('valid');
					} else {

						// 
						if(event !== undefined) {

							event.preventDefault();
						}

						if($.isFunction(data.invalid)) {

							// 
							data.invalid.call(element);
						}

						element.triggerHandler('invalid');
					}

					if($.isFunction(data.afterValidate)) {

						data.afterValidate.call(element, valid);
					}

					element.triggerHandler('validated');
				} else {

					return valid;
				}
			},
			option : function(property, value) {

				var

					// Current form.
					element = $(this),

					// Current form data.
					data = element.data(name);

				if(typeof property === 'string') {

					if(value !== undefined) {

						element.data(name)[property] = value;
					} else {

						return data[property];
					}
				} else {

					return element.data(name, $.extend({}, data, property));
				}

				return element;
			},
			valid : function() {

				var

					valid = true;

				$(this).each(function() {

					var

						element = $(this);

					if(element.is(types)) {

						var

							form = element.is('[form]') ? $('form[id="' + element.prop('form') + '"]') : element.closest('form'),

							data = form.data(name);

						if(!validateField.call(element, data, null, false).valid) {

							valid = false;
						}
					} else if(element.is('form')) {

						if(!methods.validate.call(element, null, false)) {

							valid = false;
						}
					}
				});

				return valid;
			}
		};

	// 
	$[name] = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				defaults[property] = value;
			} else {

				return defaults[property];
			}
		} else {

			return $.extend(defaults, property);
		}

		return defaults;
	};

	// 
	$.fn[name] = function() {

		var

			param = arguments;

		if(typeof param[0] === 'string' && methods.hasOwnProperty(param[0])) {

			var

				element = $(this),

				response = methods[param[0]].apply(element, Array.prototype.slice.call(param, 1));

			return response !== undefined ? response : element;
		} else {

			return $(this).each(function() {

				var

					element = $(this);

				// Verifies if the current element is a form.
				if(element.is('form')) {

					// 
					element.data(name, $.extend({}, defaults, param[0])).on(namespace('submit'), function(event) {

						methods.validate.call(this, event, true);
					});

					var

						data = element.data(name),

						fields = element.find(types);

					// 
					if(element.is('[id]')) {

						fields = fields.add($(types).filter('[form="' + element.prop('id') + '"]'));
					}

					fields = fields.filter(data.filter);

					// 
					fields.on(namespace('keyup change blur'), function(event) {

						var

							data = element.data(name),

							events = data.events;

						events = $.isArray(events) ? events : String(events).split(/\s+/);

						if($.inArray(event.type, events) > -1) {

							var

								response = validateField.call(this, data, event, true),

								status = response.status;

							if(response.valid) {

								data.eachValidField.call(this);

								$(this).triggerHandler('valid');
							} else {

								data.eachInvalidField.call(this, status);

								$(this).triggerHandler('invalid');
							}

							data.eachField.call(this, status);

							$(this).triggerHandler('validated');
						}
					});
				}
			});
		}
	};

	// A function to add validation shortcuts (data-validate="shortcut").
	$[name].add = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				validate[property] = value;
			} else {

				return validate[property];
			}
		} else {

			return $.extend(validate, property);
		}

		return validate;
	};

	// A function to extend the methods.
	$[name].extend = function(property, value) {

		if(typeof property === 'string') {

			if(value !== undefined) {

				methods[property] = value;
			} else {

				return methods[property];
			}
		} else {

			return $.extend(methods, property);
		}

		return methods;
	};

	// Stores the plugin version.
	$[name].version = '1.2.0';
})(jQuery);