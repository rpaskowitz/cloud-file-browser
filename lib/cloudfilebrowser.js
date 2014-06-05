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
        container = '#services-containers';
        
        
    return {
      
        init: function(srvs, srvsDis) {
            
            // Initialize FilePicker script and build DOM elements
            // and setup binding methods
            services = srvs;
            servicesDisplay = srvsDis;

            console.log('Services Installed: ', services);
            
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
            
            var HTML = '<section id="tab-container"><ul id="services-tabs"></ul><section id="services-containers"></section><section id="file-info"><div class="preview"></div><h2>File Details</h2><div class="fileDetails"></div></section></section><section id="loading"><span><i></i></span></section>';
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
            $('.listTable ul li.foldername').on('click', function() {
                
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
                                '<ul><li><button class="selectbutton">Select</button></li></ul>'+
                                '<ul><li><button class="downloadbutton">Download</button></li></ul>'

                $(fileInfo).addClass('show').find('.fileDetails').html(listHTML);


                $(fileInfo).find('.selectbutton').on('click', function() {
                    //TODO Create a list of selected files and notify
                    provision.fileSelected(element, $('.listTable ul li.filename').next().text());
                });

                $(fileInfo).find('.downloadbutton').on('click', function() {
                    provision.downloadFile(element, location);
                });

            });
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
            var tableHTML = this.buildTable(data, true, path);
            
            // Append data returned and start screen adjustment via CSS3 class
            $(container + ' .' + element).addClass('provisioned').append(tableHTML);

            this.animateTable(element);
            this.bindFileDragDrop();
            this.bindBreadCrumbClick(element);
            this.bindFileInfo(element);
        },
        
        buildTable: function(data, isNew, path) {
            
            if (isNew == true) {

                var obj = data.records;
                var tableHTML = '', 
                    trailingpath;
                
                console.log('table data recieved: ', data);

                //TODO Construction of a header for file path, which also needs to be used for navigate between folders
                tableHTML += '<div class="breadcrumb">' +
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
                                '</ul>';
                
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
                
                for (var i=0; i < obj.length; i++) {
                    tableHTML += '<ul draggable="true" class="loading"><li class="checkbox"><input type="checkbox"></li><li class="filename">' + obj[i].fileName + '</li><li>Pending...</li></ul>';
                }
            }

            
            tableHTML += '</div>';
            
            // Finished building, return table string
            return tableHTML;
        
        },
        
        animateTable: function(element) {
            
            var len = $('div.' + element + ' .listTable ul:not(".on")').length;
            var delay = 100;
            
            for (var i=0; i < len; i++) {
                
                $('.' + element + ' .listTable ul:not(".on"):eq('+i+')').attr('style', '-webkit-transition-delay: ' + delay + 'ms');
                delay += 100;
            
            }
            setTimeout(function() {
                $('.' + element + ' .listTable > ul').addClass('on');
            }, 50);

        },
        
        bindFileDragDrop: function() {
        
            $('.drop-zone').on('drop', function(e) {
                
                var files = e.originalEvent.dataTransfer.files
                var element = $(this).attr('aria-element');
                
                $(this).removeClass('drop-helper');
                
                // Prevent default events & propogation
                
                e.preventDefault();
                e.stopPropagation();
                
                cloudFileBrowser.uploadFiles(files, element);
                
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
        
        uploadFiles: function(files, element) {
            
            // TODO: Will need to have a method to send files
            //       to be uploaded via AJAX
            
            var tableHTML = this.buildTable(files, false);

            $('div.' + element + ' .listTable').append(tableHTML);
            
            this.animateTable(element);
            
        }
    };

})();
    
//------------------------------------------------------------------
// TODO LiST
//------------------------------------------------------------------
// 1) Masking on click of a button
// 2) Filename or Folder image based on the fileType - COMPLETE
// 3) Show the folder path on the top for navigation - COMPLETE
// 4) on change of provider spins between icons - COMPLETE
// 5) Check on refreshing the list on folder clicks - Should be complete?
// 6) Error handling and display of errors
// 7) Modal Window handling - Assuming this shold be handled by a client's third party script choice?
// 8) Doesnt work in Safari
// 9) List scrolling doesnt work
// 10) File details close doesnt work
// 11) Getting the File Browser to work in modal window, present in examples/filebrowser2.html
// 12)
//------------------------------------------------------------------