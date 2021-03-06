/*
	Copyright (C) 2014-2015 WMN aka Yanitskiy Vadim
	
	This is part of cherry.
	https://github.com/axilirator/cherry

	Cherry is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Cherry is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with cherry. If not, see <http://www.gnu.org/licenses/>.
*/

// Инициализация глобальных параметров //
var fs            = require( 'fs' );
var child_process = require( 'child_process' );

var fn = {
	'printf': function( type, message ) {
		// Добавление индикатора сообщения: [+], [-], [#], [!] //
		switch ( type ) {
			case 'log':
				message = '[+] ' + message;
				break;

			case 'warn':
				message = '[-] ' + message;
				break;

			case 'error':
				message = '[!] ' + message;
				break;

			default:
				if ( !global.DEBUG ) return;
				message = '[#] ' + message;
		}

		// Создание массива аргументов //
		var length = arguments.length;
		var args   = [ '  ' + message ];

		if ( length > 2 ) {
			for ( var i = 2; i < length; i++ ) {
				args.push( arguments[ i ] );
			}
		}

		// Вызов нативной функции //
		if ( type === 'debug' && global.DEBUG ) {
			console.info.apply( console, args );
		} else {
			console[ type ].apply( console, args );
		}
	},

	'random': function( max ) {
		return Math.floor( Math.random() * max );
	},

	/**
	 * Читает файл конфигурации в формате JSON в объект target.
	 *
	 * @param  {string}  path   Путь к файлу конфигурации
	 * @param  {object}  target Объект, которому присваиваются прочитанные директивы
	 * @return {promise}
	 */
	'read_json': function( path, target ) {
		return new Promise(
			function( resolve, reject ) {
				var file = new Promise(
					function( resolve, reject ) {
						// Читаем файл //
						fs.readFile( path,
							{
								'encoding' : 'utf8',
								'flag'     : 'r'
							},

							function( error, content ) {
								if ( error ) {
									reject( error );
								} else {
									resolve( content );
								}
							}
						);
					}
				);

				file.then(
					function( content ) {
						// Удаляем комментарии //
						var pure = content.replace( /\/\/.*$/gm, '' );

						// Попытка парсинга //
						try {
							pure = JSON.parse( pure );

							for ( var i in pure ) {
								target[ i ] = pure[ i ];
							}

							resolve( target );
						} catch ( e ) {
							// Ошибка парсинга //
							reject( 'parsing_error' );
						}
					},

					function( error ) {
						reject( 'read_error' );
					}
				);
			}
		);
	},

	'file': function( path ) {
		this.path     = path;
		this.size     = null;
		this.checksum = null;

		// Методы класса //
		
		/**
		 * Читает информацию о файле.
		 * @return {promise}
		 */
		this.info = function() {
			var self = this;

			return new Promise(
				function( resolve, reject ) {
					fs.stat( self.path,
						function( error, stats ) {
							if ( error ) {
								reject({
									'error' : error,
									'path'  : path
								});
							} else {
								// Если путь ссылается на существующий файл //
								if ( stats.isFile() ) {
									self.size = stats.size;
									resolve( self );
								} else {
									reject({
										'error' : 'NaF',
										'path'  : path
									});
								}
							}
						}
					);
				}
			);
		};

		/**
		 * Рассчитывает контрольную сумму CRC32.
		 * @return {promise}
		 */
		this.calculate_checksum = function() {
			var self = this;

			return new Promise(
				function( resolve, reject ) {
					var crc32 = child_process.exec( 'crc32 ' + self.path,
						function( error, stdout, stderr ) {
							if ( error === null ) {
								// Отрезаем символ перевода строки //
								self.checksum = stdout.substr( 0, stdout.length - 1 );
								resolve( self.checksum );
							} else {
								fn.printf( 'error', "Cannot calculate crc32. Have you a crc32 utility?" );
								reject({
									'error' : 'checksum',
									'path'  : path
								});
							}
						}
					);
				}
			);
		};
	}
};

// Чтение глобальной пользовательской конфигурации //
module.exports = fn;