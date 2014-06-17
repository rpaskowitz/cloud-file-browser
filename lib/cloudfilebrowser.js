////////////////////////////////////
// JQUERY WRAPPER FOR EASY PARAMS //
////////////////////////////////////

(function($) {
    
    $.fn.cloudFileBrowser = function(options) {
        
        cloudFileBrowser.buildDomEls(this.selector, function() {
            
            options.options['documents'] = options.documents;
            CloudElements.init(options.options);
        });
    };
    
}(jQuery));

var cloudFileBrowser = (function() {

    // PRIVATE VARIABLES
    var services = null,
        servicesDisplay = null,
        tabs = '#services-tabs',
        container = '#services-containers',
        selectedFiles = {},
        extension = '';

    return {
      
        init: function(srvs, srvsDis) {
            
            // Initialize FilePicker script and build DOM elements
            // and setup binding methods
            services = srvs;
            servicesDisplay = srvsDis;

            console.log('Services Installed: ', services);

            cloudFileBrowser.selectedFiles = {};

            this.buildTabs();
            this.bindTabs();
            this.bindProvisionButtons();
            this.initDragDropHandlers();
        },
        
        initDragDropHandlers: function() {
            
            if (window.File) {
                
                $('.drop-zone').on('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
                $('.drop-zone').on('dragenter', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
                
            }
        },
        
        buildDomEls: function(selector, cb) {
            
            var HTML = '<section id="tab-container"><ul id="services-tabs"></ul><section id="services-containers"></section><section id="file-info"><div class="preview"><a class="close" href="#"></a></div><h2>File Details</h2><div class="fileDetails"></div></section></section><section id="loading"><span><i></i></span></section><section id="error"></section>';
            $(selector).append(HTML);
            cb();
        },
        
        buildTabs: function() {
            
            // Inspect services object, and build a tab + trigger
            // for each service installed
            
            var tabsHTML = '',
                containerHTML = '';
            
            for (var i=0; i<services.length; i++) {
                tabsHTML += '<li class="' + services[i] + (i == 0 ? ' on' : '' )+ '">' + servicesDisplay[i] + '</li>';
                containerHTML +=    '<div class="' + services[i] + (i == 0 ? ' on' : '' ) + ' drop-zone" aria-element="' + services[i] + '">'+ 
                                    '<h2></h2>' +
                                    '<a href="#" class="provision" aria-element="' + services[i] + '">Connect to your ' + servicesDisplay[i] + ' account</a>' +
                                    '</div>';
            }
            
            $(tabs).append(tabsHTML);
            $(container).append(containerHTML);
            
        },
        
        bindTabs: function() {
            
            // Set the bind method for tab switches
            
            $(tabs + ' li').on('click', function() {
            
                var index = $(this).index();
                
                $('#file-info').removeClass('show');
                $('div.on, li.on').removeClass('on');
                $(this).addClass('on');
                $(container + ' > div').eq(index).addClass('on');

            });
        },
        
        bindProvisionButtons: function() {
            
            $('.provision').on('click', function() {
                
                var element = $(this).attr('aria-element');
                
                cloudFileBrowser.provisionEl(element);
            });
            
        },
        
        bindBreadCrumbClick: function(element) {

            //Onclick of breadcrumb, fetch the files under breadcrumb folder
            $('.breadcrumb ul li.home').on('click', function() {

                $('#file-info').removeClass('show');
                
                $('.addFiles, .addFilesButton').remove();
                
                $('#loading').addClass('show');

                var callbackArgs = {
                    'element' : element,
                    'path' : '/'
                };

                provision.getDocuments(element, '/', function(data, cbArgs) {
                    cloudFileBrowser.drawEl(data, cbArgs.element, cbArgs.path);
                }, callbackArgs);
            });

            $('.breadcrumb ul li.selectedPath').on('click', function() {

                $('#loading').addClass('show');

                var callbackArgs = {
                    'element' : element,
                    'path' : this.attributes[0].nodeValue
                };

                provision.getDocuments(element, this.attributes[0].nodeValue, function(data, cbArgs) {
                    cloudFileBrowser.drawEl(data, cbArgs.element, cbArgs.path);
                }, callbackArgs);
            });
        },
        
        bindFileInfo: function(element) {

            //Onclick of folder, fetch the files under folder
            $('.listTable ul li.foldername').one('click', function() {
                
                $('#file-info').removeClass('show');
                
                $('.addFiles, .addFilesButton').remove();
                
                 $('#loading').addClass('show');

                // ? Does folderName ever get used ?
                var folderName = $(this).text()
                var location = $(this).next().text();

                var callbackArgs = {
                    'element' : element,
                    'path' : location
                };

                provision.getDocuments(element, location, function(data, cbArgs) {
                    cloudFileBrowser.drawEl(data, cbArgs.element, cbArgs.path);
                }, callbackArgs);
            });

            $('.listTable ul li.filename').on('click', function() {

                var fileInfo = '#file-info';
                var fileName = $(this).text();
                var location = $(this).next().text();
                var listHTML = '<ul><li>Filename:</li><li>' + fileName + '</li></ul>' +
                                '<ul><li>Location:</li><li>' + location + '</li></ul>' +
                                '<a href="#" class="selectbutton">Select</a>'+
                                '<a href="#" class="downloadbutton">Download</a>';
                
                extension = fileName.split('.').pop();
            
                // Prepare thumbnail to be displayed
                provision.displayFile(element, location);

                $(fileInfo).addClass('show').find('.fileDetails').html(listHTML);


                $(fileInfo).find('.selectbutton').on('click', function() {
                    provision.fileSelected(element, location);
                });

                $(fileInfo).find('.downloadbutton').on('click', function() {
                    provision.downloadFile(element, location);
                });

            });
            
            $('div.preview a.close').on('click', function() {
                $('#file-info').removeClass('show');
            });

            $('.listTable ul li.checkbox').on('change', function() {
                var selectedPath = this.nextSibling.nextSibling.textContent;
                if(cloudFileBrowser.selectedFiles[element] == null
                    || cloudFileBrowser.selectedFiles[element] == undefined)
                {
                    cloudFileBrowser.selectedFiles[element] = new Array();
                }

                var position = $.inArray(selectedPath, cloudFileBrowser.selectedFiles[element]);
                if(~position)
                {
                    cloudFileBrowser.selectedFiles[element].splice(position, 1);
                }
                else
                {
                    cloudFileBrowser.selectedFiles[element].push(selectedPath);
                }
            });
        },
        
        displayThumbnail: function(data) {
          
            $('#file-info .preview img').remove();
            
            if (extension.toLowerCase() == "jpg" | "gif" | "jpeg" | "png") {
                $('#file-info .preview').append('<img src="' + data.value + '">');
            }
        },
        
        provisionEl: function(element) {
            
            // Provision the element based upon its service array name
            // Note -- Demo only, always returns successful
            
            $('#loading').addClass('show');

            var callbackArgs = {
                'element' : element
            };
            provision.createInstance(element, cloudFileBrowser.handleOnProvision, callbackArgs);
        },

        handleOnProvision: function(elementToken, cbArgs) {

            var element = cbArgs.element;

            var callbackArgs = {
                'element' : element,
                'path' : '/'
            };

            provision.getDocuments(element, '/', function(data, cbArgs) {
                cloudFileBrowser.drawEl(data, cbArgs.element, cbArgs.path);
            }, callbackArgs);
        },

        drawEl: function(data, element, path) {
            
            if (!data || !element) console.warn('Cannot draw element, Data or Element missing!');
            
            // Clean up load screen
            $('#loading').removeClass('show');

            //TODO May be a better way of refreshing the data, this is needed for folder click
            $('div.' + element + ' .listTable, div.' + element + ' .breadcrumb').remove();

            // Call for table from helper class
            var tableHTML = this.buildTable(data, true, path, element);
            
            // Append data returned and start screen adjustment via CSS3 class
            $(container + ' .' + element).addClass('provisioned').append(tableHTML);

            this.animateTable(element);
            this.bindFileDragDrop(element, path);
            this.bindAddFiles(element, path);
            this.bindBreadCrumbClick(element);
            this.bindFileInfo(element);
        },
        
        buildTable: function(data, isNew, path, element) {
            
            if (isNew == true) {

                var obj = data.records;
                var tableHTML = '', 
                    trailingpath;

                cloudFileBrowser.selectedFiles[element] = new Array();

                console.log('table data recieved: ', data);

                tableHTML += '<a href="#" class="selectFilesButton">Select Files</a><input type="file" class="hidden addFiles" multiple></input><a class="addFilesButton" href="#">Add Files</a><div class="breadcrumb">' +
                    '<ul>';

                if(path != null || path != undefined) {
                    
                    var selectedPathRes = path.split("/");

                    for (var i = 0; i < selectedPathRes.length; i++) {
                        
                        var selectedPathResRec = selectedPathRes[i];

                        if(i == 0 && selectedPathResRec == '') {
                           
                            trailingpath = '/';
                            tableHTML += '<li class="home">Home</li>';
                        }
                        else if(selectedPathResRec != null && selectedPathResRec != '') {

                            if(trailingpath == '/')
                            {
                                trailingpath = trailingpath + selectedPathResRec;
                            }
                            else
                            {
                                trailingpath = trailingpath + '/' + selectedPathResRec;
                            }

                            tableHTML += '<li class="caret"></li>';
                            tableHTML += '<li class="selectedPath" name='+trailingpath+'>'+selectedPathResRec +'</li>';
                        }
                    }
                }
                else
                {
                    tableHTML += '<li>/</li>';
                }
                tableHTML += '</ul></div>';


                tableHTML += '<div class="listTable">' +
                                '<ul>' +
                                '<li></li>' +
                                '<li>File</li>' +
                                '<li>Location</li>' +
                                '<li>Modified</li>' +
                                '</ul><div class="scrollPanel">';
                
                /////////////////////////
                // Loop for table rows //
                /////////////////////////
                for (var i=0; i < obj.length; i++) {
                    var objItm = obj[i];

                    tableHTML += '<ul draggable="true">';
                    if(objItm.isDirectory)
                        tableHTML += '<li class="checkbox"></li>' +
                                     '<li class="foldername">';
                    else
                        tableHTML += '<li class="checkbox"><input type="checkbox"></li>' +
                                     '<li class="filename">';

                    tableHTML += objItm.fileName + '</li>' +
                        '<li>' + objItm.path + '</li>' +
                        '<li>' + objItm.modifiedDate + '</li></ul>';
                }
                
            }
            else {
                
                var obj = data;
                var tableHTML = '';

                var currentIndex = $('.listTable ul').length;

                for (var i=0; i < obj.length; i++) {
                    tableHTML += '<ul draggable="true" class="loading '+ obj[i].name+'">' +
                                    '<li class="checkbox"><input type="checkbox"></li>' +
                                    '<li class="filename">' + obj[i].name + '</li>' +
                                    '<li>Uploading...</li>' +
                                 '</ul>';

                    var cbArgs = {
                        'tableHTML' : tableHTML,
                        'path' : path,
                        'element': element,
                        'currentIndex': currentIndex+i
                    };

                    provision.uploadFile(element, path, obj[i], cloudFileBrowser.handleUploadComplete, cbArgs);
                }
            }

            tableHTML += '</div></div>';
            
            // Finished building, return table string
            return tableHTML;
        
        },

        handleUploadComplete: function(cbArgs) {

            if($('.listTable ul.loading') != null)
            {
                $('.listTable ul.loading').removeClass('loading');
            }

            var tableList = $('.listTable ul');
            var ulElement = tableList[cbArgs.currentIndex];
            if(ulElement != null)
            {
                ulElement.innerHTML = '<li class="checkbox"><input type="checkbox"></li>' +
                    '<li class="fileName">' + cbArgs.data.fileName + '</li>' +
                    '<li>' + cbArgs.data.path + '</li>' +
                    '<li>' + cbArgs.data.modifiedDate + '</li>';
            }
        },

        animateTable: function(element) {
            
            var len = $('div.' + element + ' .listTable .scrollPanel ul:not(".on")').length;
            var delay = 100;
            
            for (var i=0; i < len; i++) {
                
                $('.' + element + ' .listTable .scrollPanel  ul:not(".on"):eq('+i+')').attr('style', '-webkit-transition-delay: ' + delay + 'ms');
                delay += 50;
            
            }
            setTimeout(function() {
                $('.' + element + ' .listTable .scrollPanel > ul').addClass('on');
            }, 50);

        },
        
        bindAddFiles: function(element, path) {
            
            $('.addFilesButton').unbind('click');
            $('.addFiles').unbind('change');
            
            $('.addFilesButton').on('click', function() {
            
                $('.' + element + ' .addFiles').trigger('click');
                
            });
            
            $('.addFiles').on('change', function(e) {
            
                cloudFileBrowser.uploadFiles(element, path, this.files);
                
            });

            $('.selectFilesButton').on('click', function() {
                provision.fileSelected(element, cloudFileBrowser.selectedFiles[element]);
            });

        },
        
        bindFileDragDrop: function(element, path) {
        
            $('.drop-zone').unbind('drop');
            
            $('.drop-zone').on('drop', function(e) {
                
                var files = e.originalEvent.dataTransfer.files
                var element = $(this).attr('aria-element');
                
                $(this).removeClass('drop-helper');
                
                // Prevent default events & propogation
                
                e.preventDefault();
                e.stopPropagation();
                
                cloudFileBrowser.uploadFiles(element, path, files);
                
            });
            
            $('.drop-zone').on('dragover', function(e) {

                // Check for ONLY files dragged into view,
                // otherwise ignore if an el from the screen

               // if (e.originalEvent.dataTransfer.items.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();

                    $(this).addClass('drop-helper');
               // }

            });
        
        },
        
        displayError: function(err) {
        
            $('#error').html(err).addClass('show');
            
            setTimeout(function() {
                $('#error').removeClass('show');
            }, 1500);
            
            
        },
        
        uploadFiles: function(element, path, files) {
            
            var tableHTML = this.buildTable(files, false, path, element);

            $('div.' + element + ' .listTable').append(tableHTML);
            
            this.animateTable(element);
            
        }
    };

})();
    
//------------------------------------------------------------------
// TODO LiST
//------------------------------------------------------------------
//Pending items with main task
//- Documentation [Ramana/Phil]
//- x-browser testing [Ramana/Phil]
//- styling of download & upload [Phil] - done
//- Display of image for the selected file [Phil] - done (for images only -- need to figure out other formats to display?)
//- Error handling and display of errors [Phil]
//
//Sub tasks
//- Need a single import for the customers to include in their browser [Ramana]
//- Wrapper Page which includes Cloud File Browser [Phil]
//- Example 1 - To use the CloudFileBrowser as is  [Phil] - done
//- Example 2 - To use the CloudFileBrowser in a modal window  [Phil] - done
//- Implement Uploading of files  [Ramana] - done
//
//Current Defects
//- Doesnt work in Safari [Phil]
//- List scrolling doesnt work [Phil] - done, still a bug in Chrome
//- File details close doesnt work [Phil] - done
// -Multiple Drag drop bindings
// -Bindings of file after upload (unbind / rebind after success)
//------------------------------------------------------------------