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
        
        bindFileInfo: function(element) {

            //Onclick of folder, fetch the files under folder
            $('.listTable ul li.foldername').on('click', function() {

                var folderName = $(this).text();
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

                // STUB CODE TO SHOW FILE INFO
                // WILL UPDATE WHEN WE HAVE JSON

                var fileInfo = '#file-info';
                var fileName = $(this).text();
                var location = $(this).next().text();
                var listHTML = '<ul><li>Filename:</li><li>' + fileName + '</li></ul>' +
                    '<ul><li>Location:</li><li>' + location + '</li></ul>' +
                    '<ul><li><button class="selectbutton">Select</button></li></ul>';

                $(fileInfo).addClass('show').find('.fileDetails').html(listHTML);


                $(fileInfo).find('.selectbutton').on('click', function() {
                    //TODO Create a list of selected files and notify
                    provision.fileSelected(element, $('.listTable ul li.filename').next().text());
                });

            });
        },
        
        provisionEl: function(element) {
            
            // Provision the element based upon its service array name
            // Note -- Demo only, always returns successful
            
            $('#credentials').addClass('show');
            $('#credentials span i').text(element);

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
            setTimeout(function() {
                $('#credentials').removeClass('show');
            }, 500);

            //TODO May be a better way of refreshing the data, this is needed for folder click
            $('div.' + element + ' .listTable').remove();

            // Call for table from helper class
            var tableHTML = this.buildTable(data, true, path);
            
            // Append data returned and start screen adjustment via CSS3 class
            $(container + ' .' + element).addClass('provisioned').append(tableHTML);
            
            this.animateTable(element);
            this.bindFileDragDrop();
            this.bindFileInfo(element);
        },
        
        buildTable: function(data, isNew, path) {
            
            if (isNew == true) {

                var obj = data.records;
                var tableHTML = '', trailingpath;

                //TODO Construction of a header for file path, which also needs to be used for navigate between folders
//                tableHTML += '<div class="headerTable">' +
//                    '<ul>';
//
//                if(path != null || path != undefined)
//                {
//                    var selectedPathRes = path.split("/");
//
//                    for ( var int = 0; int < selectedPathRes.length; int++)
//                    {
//                        var selectedPathResRec = selectedPathRes[int];
//
//                        if(int == 0 && selectedPathResRec == null)
//                        {
//                            trailingpath = '/';
//                            tableHTML += '<li>/</li>';
//                        }
//                        else if(selectedPathResRec != null)
//                        {
//                            trailingpath = trailingpath + '/' + selectedPathResRec;
//
//                            tableHTML += '<li>" > "</li>';
//                            tableHTML += '<li>'+selectedPathResRec +'</li>';
//                        }
//                    }
//                }
//                else
//                {
//                    tableHTML += '<li>/</li>';
//                }
//                tableHTML += '</ul></div>';


                tableHTML += '<div class="listTable">' +
                                '<ul>' +
                                '<li>File</li>' +
                                '<li>Location</li>' +
                                '<li>Modified</li>' +
                                '</ul>';
                
                /////////////////////////
                // Loop for table rows //
                /////////////////////////
                for (var i=0; i < obj.length; i++) {
                    var objItm = obj[i];

                    tableHTML += '<ul draggable="true"><li class="checkbox"><input type="checkbox"></li>';
                    if(objItm.isDirectory)
                        tableHTML += '<li class="foldername">';
                    else
                        tableHTML += '<li class="filename">';

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
// 2) Filename or Folder image based on the fileType
// 3) Show the folder path on the top for navigation
// 4) on change of provider spins between icons
// 5) Check on refreshing the list on folder clicks
// 6) Error handling and display of errors
// 7) Modal Window handling
// 8)
//------------------------------------------------------------------