
(function($, ShowDown, CodeMirror) {
	"use strict";

	$(function() {

		if (!document.getElementById('entry-markdown'))
			return;

		//var delay;
		var converter = new ShowDown.converter(),
			editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
				mode: 'markdown',
				tabMode: 'indent',
				lineWrapping: true
			});
      window.editor = editor;
		// Really not the best way to do things as it includes Markdown formatting along with words
		function updateWordCount() {
			var wordCount = document.getElementsByClassName('entry-word-count')[0],
				editorValue = editor.getValue();

			if (editorValue.length) {
				wordCount.innerHTML = editorValue.match(/\S+/g).length + ' words';
			}
		}

		function updateImagePlaceholders(content) {
			var imgPlaceholders = $(document.getElementsByClassName('rendered-markdown')[0]).find('p').filter(function() {
				return (/^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim).test($(this).text());
			});

			$(imgPlaceholders).each(function( index ) {

				var elemindex = index,
					self = $(this),
					altText = self.text();

				(function(){

					self.dropzone({
						url: "/article/imgupload",
						success: function( file, response ){
							var holderP = $(file.previewElement).closest("p"),

								// Update the image path in markdown
								imgHolderMardown = $(".CodeMirror-code").find('pre').filter(function() {
							    	return (/^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(?:\(([^\n\]]*)\))?$/gim).test(self.text()) && (self.find("span").length === 0);
								}),

								// Get markdown
								editorOrigVal = editor.getValue(),
								nth = 0,
								newMarkdown = editorOrigVal.replace(/^(?:\{<(.*?)>\})?!(?:\[([^\n\]]*)\])(:\(([^\n\]]*)\))?$/gim, function (match, i, original){
									nth++;
									return (nth === (elemindex+1)) ? (match + "(" + response.path +")") : match;
								});
								editor.setValue( newMarkdown );

							// Set image instead of placeholder
							holderP.removeClass("dropzone").html('<img src="'+ response.path +'"/>');
						}
					}).addClass("dropzone");
				}());
			})
		}

		function updatePreview() {
			var preview = document.getElementsByClassName('rendered-markdown')[0];
			preview.innerHTML = converter.makeHtml(editor.getValue());

			updateImagePlaceholders(preview.innerHTML);
			updateWordCount();
		}

		$(document).ready(function() {
			$('.entry-markdown header, .entry-preview header').click(function(e) {
				$('.entry-markdown, .entry-preview').removeClass('active');
				$(e.target).closest('section').addClass('active');
			});

			editor.on("change", function() {
				updatePreview();
			});

			updatePreview();
      $('#article-name').on('change', function(event) {
        var name = event.target.value;
				if ($('#article-filename').val().trim() === '') {
					$('#article-filename').val(kebabCase(name));
				}
      })
      $.get('/files', function(data) {
        var foo = makeUL(data.files);
        $('.file-list').append(foo);
      });

      $('body').on('click', 'a[data-article-link]', function(event) {
        $.get('/files/' + $(event.target).attr('data-article-link'), function(data) {
          console.log('result', data)
          editor.setValue(data.content);
					$('#old-fullpath').val(data.language + '/' + (data.directory !== '.' ? data.directory + '/' : '') + data.filename);
          $('#article-filename').val(data.filename);
          $('#article-directory').val(data.directory);
          $('#article-name').val(data.attributes.title || 'no-title');
        })
      })

			$('.save-article').on('click', function(event) {
				$('#article-name').blur();
				$.post('/file', {
					oldPath: $('#old-fullpath').val(),
					filename: $('#article-filename').val(),
					language: $('.article-language').val(),
					directory: $('#article-directory').val(),
					content: editor.getValue(),
					attributes: {
						title: $('#article-name').val()
					}
				});
			});

			// Sync scrolling
			function syncScroll(e) {
				// vars
				var $codeViewport = $(e.target),
					$previewViewport = $('.entry-preview-content'),
					$codeContent = $('.CodeMirror-sizer'),
					$previewContent = $('.rendered-markdown'),

					// calc position
					codeHeight = $codeContent.height() - $codeViewport.height(),
					previewHeight = $previewContent.height() - $previewViewport.height(),
					ratio = previewHeight / codeHeight,
					previewPostition = $codeViewport.scrollTop() * ratio;

				// apply new scroll
				$previewViewport.scrollTop(previewPostition);
			}

			// TODO: Debounce
			$('.CodeMirror-scroll').on('scroll', syncScroll);

			// Shadow on Markdown if scrolled
			$('.CodeMirror-scroll').scroll(function() {
				if ($('.CodeMirror-scroll').scrollTop() > 10) {
					$('.entry-markdown').addClass('scrolling');
				} else {
					$('.entry-markdown').removeClass('scrolling');
				}
			});
			// Shadow on Preview if scrolled
			$('.entry-preview-content').scroll(function() {
				if ($('.entry-preview-content').scrollTop() > 10) {
					$('.entry-preview').addClass('scrolling');
				} else {
					$('.entry-preview').removeClass('scrolling');
				}
			});

		});
	});
}(jQuery, Showdown, CodeMirror));

$('.dropdown-toggle').dropdown();

function makeUL(array) {
    // Create the list element:
    var list = document.createElement('ul');
    for(var i = 0; i < array.length; i++) {
        // Create the list item:
        var link = document.createElement('a');
        $(link).attr('data-article-link', array[i]);
        link.text = array[i].replace('.md', '');
        link.href = 'javascript:;';
        var item = document.createElement('li');
        // Set its contents:
        item.appendChild(link);
        // Add it to the list:
        list.appendChild(item);
    }
    // Finally, return the constructed list:
    return list;
}
