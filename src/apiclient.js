var request = require('superagent');
var util = require('./util');
var isUrl = require('is-url');
var fs = require('fs');
var tempfile = require('tempfile');
var format = require('fr');

var endpoint = 'https://api.telegram.org/bot{0}/{1}';

function is (type) {
	return function (el) {
		return Object.prototype.toString.call(el) === '[object ' + type + ']';
	};
}

function ApiClient (token) {

	function _post (method, payload, options) {
		return new Promise(function (resolve, reject) {
			request
				.post(format(endpoint, token, method))
				.type('json')
				.send(payload || {})
				.send(options || {})
				.end(function (err, res) {
					if (err) {
						return reject(err);
					} else if (res && res.ok) {
						return resolve(res.body);
					}
					reject(new Error(
						(res && res.body && res.body.description) ||
						'Unknown error performing POST request'
					));
				});
		});
	}

	function _get (method, payload, options) {
		return new Promise(function (resolve, reject) {
			request
				.get(format(endpoint, token, method))
				.send(payload || {})
				.send(options || {})
				.end(function (err, res) {
					if (err) {
						return reject(err);
					} else if (res && res.ok) {
						return resolve(res.body);
					}
					reject(new Error(
						(res && res.body && res.body.description) ||
						'Unknown error performing GET request'
					));
				});
		});
	}

	function _fetchMedia (mediaLocation) {
		return new Promise(function (resolve, reject) {
			request
				.get(mediaLocation)
				.end(function (err, res) {
					if (err) {
						reject(err);
						return;
					}

					if (res && res.ok) {
						var tmpPath = tempfile(res.header['content-type'].split('/')[1]);
						return fs.writeFile(tmpPath, res.body, function (err) {
							if (err) {
								reject(err);
							} else {
								resolve(tmpPath);
							}
						});
					}
					reject(new Error(
						(res && res.body && res.body.description) ||
						'Unknown error performing retrieving requested media'
					));
				});
		});
	}

	function _postMedia (type, payload, options, apiMethod) {
		return new Promise(function (resolve, reject) {
			if (!apiMethod) {
				apiMethod = format(
					'{0}{1}{2}',
					'send',
					type[0].toUpperCase(),
					type.substr(1, type.length -1)
				);
			}

			var r = request
				.post(format(endpoint, token, apiMethod))
				.field('chat_id', payload.chat_id);

			var mediaData = isUrl(payload.media)
				? _fetchMedia(payload.media).then(function (data) {
					return [data, true];
				})
				: Promise.resolve([payload.media, false])

			if (options) {
				Object.keys(options).forEach(function (key) {
					r.field(key, options[key]);
				});
			}

			mediaData.then(function (data) {
				var media = data[0];
				var unlink = data[1];

				if (util.isFileId(data)) {
					r.field(type, media);
				} else {
					r.attach(type, media);
				}

				r.end(function (err, res) {
					if (unlink) {
						fs.unlink(media, Function.prototype);
					}
					if (err) {
						return reject(err);
					} else if (res.ok) {
						return resolve(res.body);
					}
					reject(new Error(
						(res && res.body && res.body.description) ||
						'Unknown error performing POST request'
					));
				});
			}, reject);
		});

	}

	this.sendMessage = function (chatId, message, options) {
		var payload = {
			chat_id: chatId,
			text: message
		};
		return _post('sendMessage', payload, options);
	};

	this.sendChatAction = function (chatId, action) {
		var payload = {
			chat_id: chatId,
			action: action
		};
		return _post('sendChatAction', payload);
	};

	this.forwardMessage = function (chatId, fromChatId, messageId) {
		var payload = {
			chat_id: chatId,
			from_chat_id: fromChatId,
			message_id: messageId
		};
		return _post('forwardMessage', payload);
	};

	this.sendLocation = function (chatId, lat, lon, options) {
		var payload = {
			chat_id: chatId,
			latitude: lat,
			longitude: lon
		};
		return _post('sendLocation', payload, options);
	};

	this.sendVenue = function (chatId, lat, lon, title, address, options) {
		var payload = {
			chat_id: chatId,
			latitude: lat,
			longitude: lon,
			title: title,
			address: address
		};
		return _post('sendVenue', payload, options);
	};

	this.sendPhoto = function (chatId, photo, options) {
		var payload = {
			chat_id: chatId,
			media: photo
		};
		return _postMedia('photo', payload, options);
	};

	this.sendAudio = function (chatId, audio, options) {
		var payload = {
			chat_id: chatId,
			media: audio
		};
		return _postMedia('audio', payload, options);
	};

	this.sendVoice = function (chatId, voice, options) {
		var payload = {
			chat_id: chatId,
			media: voice
		};
		return _postMedia('voice', payload, options);
	};

	this.sendSticker = function (chatId, sticker, options) {
		var payload = {
			chat_id: chatId,
			media: sticker
		};
		return _postMedia('sticker', payload, options);
	};

	this.sendDocument = function (chatId, doc, options) {
		var payload = {
			chat_id: chatId,
			media: doc
		};
		return _postMedia('document', payload, options);
	};

	this.sendVideo = function (chatId, video, options) {
		var payload = {
			chat_id: chatId,
			media: video
		};
		return _postMedia('video', payload, options);
	};

	this.sendContact = function (chatId, phoneNumber, firstName, options) {
		var payload = {
			chat_id: chatId,
			phone_number: phoneNumber,
			first_name: firstName
		};
		return _post('sendContact', payload, options);
	};

	this.getUserProfilePhotos = function (userId, options) {
		var payload = {
			user_id: userId
		};
		return _get('getUserProfilePhotos', payload, options);
	};

	this.getMe = function () {
		return _get('getMe', {});
	};

	this.getChat = function (chatId) {
		var payload = {
			chat_id: chatId
		};
		return _get('getChat', payload);
	};

	this.getChatAdministrators = function (chatId) {
		var payload = {
			chat_id: chatId
		};
		return _get('getChatAdministrators', payload);
	};

	this.getChatMembersCount = function (chatId) {
		var payload = {
			chat_id: chatId
		};
		return _get('getChatMembersCount', payload);
	};

	this.getChatMember = function (chatId, userId) {
		var payload = {
			chat_id: chatId,
			user_id: userId
		};
		return _get('getChatMember', payload);
	};

	this.leaveChat = function (chatId) {
		var payload = {
			chat_id: chatId
		};
		return _get('leaveChat', payload);
	};

	this.kickChatMember = function (chatId, userId) {
		var payload = {
			chat_id: chatId,
			user_id: userId
		};
		return _post('kickChatMember', payload);
	};

	this.unbanChatMember = function (chatId, userId) {
		var payload = {
			chat_id: chatId,
			user_id: userId
		};
		return _post('unbanChatMember', payload);
	};

	this.answerCallbackQuery = function (callbackQueryId, options) {
		var payload = {
			callback_query_id: callbackQueryId
		};
		return _post('answerCallbackQuery', payload, options);
	};

	this.editMessageText = function (/*[chatId,] identifier, text[, options]*/) {
		var args = [].slice.call(arguments);
		var payload = {}, options;
		if (args.length < 4 && is('String')(args[0]) && is('String')(args[1])) {
			payload.inline_message_id = args[0];
			payload.text = args[1];
			options = args[2];

		} else if (args.length > 2 && (!args.slice(0, 3).some(is('Object')))) {
			payload.chat_id = args[0];
			payload.message_id = args[1];
			payload.text = args[2];
			options = args[3];
		} else {
			return Promise.reject(new Error('Could not handle passed arguments'));
		}
		return _post('editMessageText', payload, options);
	};

	this.editMessageCaption = function (/*[chatId,] identifier[, options]*/) {
		var args = [].slice.call(arguments);
		var payload = {}, options;
		if (args.length === 2 &&  args.every(is('String'))) {
			payload.inline_message_id = args[0];
			options = args[1];
		} else if (args.length > 1 && (!args.slice(0, 2).some(is('Object')))) {
			payload.chat_id = args[0];
			payload.message_id = args[1];
			options = args[2];
		} else {
			return Promise.reject(new Error('Could not handle passed arguments'));
		}
		return _post('editMessageCaption', payload, options);
	};

	this.editMessageReplyMarkup = function (/*[chatId,] identifier[, options]*/) {
		var args = [].slice.call(arguments);
		var payload = {}, options;
		if (args.length === 2 &&  args.every(is('String'))) {
			payload.inline_message_id = args[0];
			options = args[1];
		} else if (args.length > 1 && (!args.slice(0, 2).some(is('Object')))) {
			payload.chat_id = args[0];
			payload.message_id = args[1];
			options = args[2];
		} else {
			return Promise.reject(new Error('Could not handle passed arguments'));
		}
		return _post('editMessageReplyMarkup', payload, options);
	};

	this.answerInlineQuery = function (inlineQueryId, results, options) {
		var payload = {
			inline_query_id: inlineQueryId,
			results: results
		};
		return _post('answerInlineQuery', payload, options);
	};

	this.setWebhook = function (url) {
		var payload = {
			url:  url
		};
		return _post('setWebhook', payload);
	};

	this.getUpdates = function (options) {
		return _get('getUpdates', null, options);
	};

}

module.exports = ApiClient;
