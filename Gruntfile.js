/**
@toc
2. load grunt plugins
3. init
4. setup variables
5. grunt.initConfig
6. register grunt tasks

*/

'use strict';

module.exports = function(grunt) {

  // configurable paths
  var yeomanConfig = {
    base: '.'
  };

	/**
	Load grunt plugins
	@toc 2.
	*/
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-karma');

	/**
	Function that wraps everything to allow dynamically setting/changing grunt options and config later by grunt task. This init function is called once immediately (for using the default grunt options, config, and setup) and then may be called again AFTER updating grunt (command line) options.
	@toc 3.
	@method init
	*/
	function init(params) {
		/**
		Project configuration.
		@toc 5.
		*/
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
          dest: 'dist/ui-table-view.js'
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
					src:    'src/ui-table-view.js',
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
        },
        continuous: {
          configFile: 'karma.conf.js',
          singleRun: true,
          browsers: ['PhantomJS']
        }
			}
		});
		
		
		/**
		register/define grunt tasks
		@toc 6.
		*/
		// Default task(s).
		// grunt.registerTask('default', ['jshint:beforeconcat', 'less:development', 'concat:devJs', 'concat:devCss']);
		grunt.registerTask('default', ['concat:build', 'jshint:beforeconcatQ', 'less:development', 'uglify:build']);

    grunt.registerTask('server', [
      'default',
      'karma:unit:start',
      'connect:server:livereload',
      'watch'
    ]);


  }
	init({});		//initialize here for defaults (init may be called again later within a task)

};