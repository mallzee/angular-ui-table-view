'use strict';

module.exports = function(grunt) {

  // configurable paths
  var yeomanConfig = {
    base: '.'
  };

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-karma');

	function init(params) {
		grunt.initConfig({
      watch: {
        html: {
          files: ['pages/**', 'index.html'],
          options: {
            livereload: true
          }
        },
        less: {
          files: ['*.less'],
          tasks: ['less:development'],
          options: {
            livereload: true
          }
        },
        karma: {
          files: ['src/ui-table-view.js', 'test/ui-table-view.js'],
          tasks: ['karma:unit:run']
        }
      },
      connect: {
        server: {
          options: {
            port: 9001,
            base: yeomanConfig.base,
            // Change this to '0.0.0.0' to access the server from outside.
            hostname: '0.0.0.0'
          }
        }
      },
			concat: {
				devCss: {
					src:    [],
					dest:   []
				},
        build: {
          src: ['src/ui-table-view.js'],
          dest: 'debug/ui-table-view.js'
        }
			},
			jshint: {
				options: {
					//force:          true,
					globalstrict:   true,
					//sub:            true,
					node: true,
					loopfunc: true,
					browser:        true,
					devel:          true,
					globals: {
						angular:    false,
						$:          false,
						moment:		false,
						Pikaday: false,
						module: false,
						forge: false,
            _: false
					}
				},
				beforeconcat:   {
					options: {
						force:	false,
						ignores: ['**.min.js']
					},
					files: {
						src: []
					}
				},
				//quick version - will not fail entire grunt process if there are lint errors
				beforeconcatQ:   {
					options: {
						force:	true,
						ignores: ['**.min.js']
					},
					files: {
						src: ['**.js']
					}
				}
			},
			uglify: {
				options: {
					mangle: false
				},
				build: {
					files:  {},
					src:    'debug/ui-table-view.js',
					dest:   'dist/ui-table-view.min.js'
				}
			},
			less: {
				development: {
					options: {
					},
					files: {
						"dist/ui-table-view.css": "less/_base.less"
					}
				}
			},
      karma: {
				unit: {
					configFile: 'karma.conf.js',
          background: true
          //browsers: ['Chrome']
        },
        continuous: {
          configFile: 'karma.conf.js',
          singleRun: true,
          browsers: ['PhantomJS']
        }
			}
		});

		// Default task(s).
		grunt.registerTask('default', ['concat:build', 'jshint:beforeconcatQ', 'less:development', 'uglify:build']);

    grunt.registerTask('continuous', ['default', 'karma:continuous']);

    grunt.registerTask('server', [
      'default',
      'karma:unit:start',
      'connect:server:livereload',
      'watch'
    ]);

  }
	init({});		//initialize here for defaults (init may be called again later within a task)

};