
// Generated on 2013-09-19 using generator-webapp 0.4.2
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {
  // show elapsed time at the end
  require('time-grunt')(grunt);
  // load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // configurable paths
  var yeomanConfig = {
    app: 'app',
    dist: 'public'
  };

  grunt.initConfig({
    yeoman: yeomanConfig,
    watch: {
      compass: {
        files: ['<%= yeoman.app %>/scss/{,*/}*.{scss,sass}'],
        tasks: ['compass:server']
      },
      scripts: {
        files: ['<%= yeoman.app %>/js/{,*/}*.js'],
        tasks: ['concat:scripts']
      }
    },
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= yeoman.dist %>/*',
            '!<%= yeoman.dist %>/.git*'
          ]
        }]
      },
      styles: {
        src: ['<%= yeoman.app %>/css']
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'Gruntfile.js',
        '<%= yeoman.app %>/js/{,*/}*.js',
        '!<%= yeoman.app %>/js/vendor/*'
      ]
    },
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>/scss',
        cssDir: '<%= yeoman.app %>/css',
        generatedImagesDir: '<%= yeoman.app %>/images/generated',
        imagesDir: '<%= yeoman.app %>/images',
        javascriptsDir: '<%= yeoman.app %>/js',
        fontsDir: '<%= yeoman.app %>/fonts',
        importPath: '<%= yeoman.app %>/bower_components',
        httpImagesPath: '/images',
        httpGeneratedImagesPath: '/images/generated',
        httpFontsPath: '/fonts',
        relativeAssets: false
      },
      dist: {
        options: {
          generatedImagesDir: '<%= yeoman.dist %>/images/generated'
        }
      },
      server: {
        options: {
          debugInfo: true
        }
      }
    },
    rev: {
      dist: {
        files: {
          src: [
            '<%= yeoman.dist %>/js/{,*/}*.js',
            '<%= yeoman.dist %>/css/{,*/}*.css',
            '<%= yeoman.dist %>/images/{,*/}*.{png,jpg,jpeg,gif,webp}',
            '<%= yeoman.dist %>/fonts/{,*/}*.*'
          ]
        }
      }
    },
    useminPrepare: {
      options: {
        dest: '<%= yeoman.dist %>'
      },
      html: '<%= yeoman.app %>/index.html'
    },
    usemin: {
      options: {
        dirs: ['<%= yeoman.dist %>']
      },
      html: ['<%= yeoman.dist %>/{,*/}*.html'],
      css: ['<%= yeoman.dist %>/css/{,*/}*.css']
    },
    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.{png,jpg,jpeg}',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },
    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= yeoman.dist %>/images'
        }]
      }
    },
    cssmin: {
      // This task is pre-configured if you do not wish to use Usemin
      // blocks for your CSS. By default, the Usemin block from your
      // `index.html` will take care of minification, e.g.
      //
      //     <!-- build:css({.tmp,app}) styles/main.css -->
      //
      // dist: {
      //     files: {
      //         '<%= yeoman.dist %>/styles/main.css': [
      //             '.tmp/styles/{,*/}*.css',
      //             '<%= yeoman.app %>/styles/{,*/}*.css'
      //         ]
      //     }
      // }
    },
    htmlmin: {
      dist: {
        options: {
            /*removeCommentsFromCDATA: true,
            // https://github.com/yeoman/grunt-usemin/issues/44
            //collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true*/
        },
        files: [{
          expand: true,
          cwd: '<%= yeoman.app %>',
          src: '*.html',
          dest: '<%= yeoman.dist %>'
        }]
      }
    },
    // Put files not handled in other tasks here
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.app %>',
          dest: '<%= yeoman.dist %>',
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            'images/{,*/}*.{webp,gif}',
            'fonts/{,*/}*.*'
          ]
        }]
      }
    },
    concurrent: {
      server: {
        tasks: ['nodemon:server', 'watch:compass', 'watch:scripts'],
        options: {
          logConcurrentOutput: true
        }
      },
      dist: [
        'compass:dist',
        'imagemin',
        'svgmin',
        'htmlmin'
      ]
    },
    nodemon: {
      server: {
        options: {
          file: 'server.js',
          args: [],
          watchedFolders: [
            // any other folders you want to watch
          ],
          env: {
            PORT: '3000'
          },
          debug: true,
          delayTime: 1,
          cwd: __dirname
        }
      }
    },
    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: '\n\n'
      },
      scripts: {
        files: {
          '<%= yeoman.app %>/js/editor.js': [
            '<%= yeoman.app %>/js/editor/app.js',
            '<%= yeoman.app %>/js/editor/templates/compiled.js',
            '<%= yeoman.app %>/js/editor/lib/*.js',
            '<%= yeoman.app %>/js/editor/modules/*.js',
            '<%= yeoman.app %>/js/editor/controllers/*.js',
            '<%= yeoman.app %>/js/editor/models/*.js',
            '<%= yeoman.app %>/js/editor/collections/*.js',
            '<%= yeoman.app %>/js/editor/layouts/*.js',
            '<%= yeoman.app %>/js/editor/views/*.js'
          ]
        }
      }
    }
  });

  grunt.registerTask('server', ['clean:styles', 'concat:scripts', 'compass:server', 'concurrent:server']);

  grunt.registerTask('build', [
    'clean',
    'useminPrepare',
    'concurrent:dist',
    'concat',
    'cssmin',
    'uglify',
    'copy',
    'rev',
    'usemin'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'build'
  ]);
};
