/*
    
    Cloud Elements HTML5 FilePicker Provisioning 
    
    Author: phil@cloud-elements.com
    Date: 4/9/2014

    The following script is for provisioning services used with 
    the FilePicker application.
    
    //////////////////////////////////////////////////////////////////
    // TODOs
    // 1 - Will most likely require a base64 encode method
    // 2 - Map out provisioning for services, perhaps a dictionary?
    // 3 - Create *actual* error handling, not just print statements
    ///////////////////////////////////////////////////////////////////
    
*/

var CloudElements = (function() {

    var cedocumentconfig = null, oSec = null,
        uSec = null, aKey = null, envUrl=null,
        ceconfig =null,
        notif = null, callback=null,
    servicemapping = {
        'box' : 'Box',
        'dropbox': 'Dropbox',
        'googledrive': 'Google Drive',
        'onedrive': 'OneDrive',
        'sharepoint': 'SharePoint'
    };

    return {
        getConfig: function() {
            return cedocumentconfig;
        },

        getOTkn: function() {
            return oSec;
        },

        getUTkn: function() {
            return uSec;
        },

        getAkey: function() {
            return uSec;
        },

        getEnvUrl: function() {
            return envUrl;
        },

        setNotification: function(element, token, action) {

            if(callback != null || callback != undefined) {
                callback(action, {element:token});
            }

            if(notif == null || notif == undefined) {
                notif = new Object;
            }

            if(notif.action == null || notif.action == undefined) {
                notif[action] = new Object;
            }

            notif[action][element] = token;
        },

        getNotification: function() {
            return notif;
        },

        init: function(config) {

            cedocumentconfig = config.documents;
            oSec = config.oSec;
            uSec = config.uSec;
            aKey = config.aKey;
            callback = config.callback;
            ceconfig = config;

            if(config.env == null || config.env == undefined) {
                envUrl = 'https://console.cloud-elements.com/elements/'
            }
            else {
                envUrl = config.env;
            }

            var docservices = [],
                docservicesnames = [];
            for(var x in cedocumentconfig)
            {
                docservices.push(x);
                docservicesnames.push(servicemapping[x]);
            }

            filePicker.init(docservices, docservicesnames);
        },

        updateCallback: function(pagequery) {

            provision.processNextOnCallback(pagequery);
        }
    };
})();

var provision = (function() {

     var lastCallbackArgs = null;
    _provision = {
        getTokenForElement: function(element) {
            var eleObj = CloudElements.getConfig()[element];
            return eleObj['elementToken'];
        },

        getParentTokenForElement: function(element) {
            var eleObj = CloudElements.getConfig()[element];
            return eleObj['elementTemplate'];
        },

        getElementDetails: function(element) {
            var eleObj = CloudElements.getConfig()[element];
            return eleObj;
        },

        setTokenToElement: function(element, token) {
            var eleObj = CloudElements.getConfig()[element];
            eleObj['elementToken'] = token;

            CloudElements.setNotification(element, token, 'create');
        },

        getParamsFromURI: function(queryparams) {
            var uri = decodeURI(queryparams);
            var chunks = uri.split('&');
            var params = Object();

            for (var i=0; i < chunks.length ; i++) {
                var chunk = chunks[i].split('=');
                if(chunk[0].search("\\[\\]") !== -1) {
                    if( typeof params[chunk[0]] === 'undefined' ) {
                        params[chunk[0]] = [chunk[1]];

                    } else {
                        params[chunk[0]].push(chunk[1]);
                    }


                } else {
                    params[chunk[0]] = chunk[1];
                }
            }

            return params;
        }
    };

    return {

        getDocuments: function(element, path, cb, cbArgs) {
            server.list(_provision.getTokenForElement(element), path, cb, cbArgs);
        },

        createInstance: function(element, cb, cbArgs) {

            //Step 1 : Check if the element token is present, if so list the documents
            var eleTkn = _provision.getTokenForElement(element);
            if(eleTkn != null) {
                cb(eleTkn, cbArgs);
                return;
            }

            //Step 2 : Check if Parent Token Exists, if so create an Instance using parent token
            var prntTkn = _provision.getParentTokenForElement(element);
            if(prntTkn != null && prntTkn != undefined) {

                var win = window.open('', '_target');

                var callbackArgs = {
                    'cbFun' : cb,
                    'cbArgs': cbArgs,
                    'element': element,
                    'win' : win
                }
                server.getOAuthUrlOnTemplate(element, prntTkn, provision.handleOnGetOAuthUrl, callbackArgs);

                return;
            }

            //Step 3 : Check if API Key and Secret Exists, create an instance using those keys
            var elementDetails = _provision.getElementDetails(element);
            if(elementDetails != null && elementDetails != undefined) {

                var win = window.open('', '_target');

                var callbackArgs = {
                    'cbFun' : cb,
                    'cbArgs': cbArgs,
                    'element': element,
                    'win' : win,
                    'elementDetails': elementDetails
                }

                server.getOAuthUrlOnAPIKey(element, elementDetails.apiKey, elementDetails.apiSecret,
                    elementDetails.callbackUrl, provision.handleOnGetOAuthUrl, callbackArgs);

                return;
            }
        },

        handleOnGetOAuthUrl: function(data, cbArgs) {
            lastCallbackArgs = cbArgs;
            cbArgs.win.location.href = data.value;
        },

        processNextOnCallback: function(queryparams) {

            var pageParameters = _provision.getParamsFromURI(queryparams);
            var not_approved= pageParameters.not_approved;

            if(not_approved) {
                // TODO Show that not approved
                return;
            }

//            var code= pageParameters.code;
//            var secret= pageParameters.secret;
//            var oauth_token = pageParameters.oauth_token;
//            //oauth.user.secret
//            //oauth.user.token
//
//            var provisionConfigs = [
//                {
//                    "key": "oauth.user.secret",
//                    propertyValue : secret
//                },
//                {
//                    "key": "oauth.user.token",
//                    propertyValue : oauth_token
//                }
//            ];

            var ele = lastCallbackArgs.element;

            var cbArgs = {
                'element' : ele,
                'cbFun'   : lastCallbackArgs.cbFun,
                'cbArgs'  : lastCallbackArgs.cbArgs
            };

            //Provision the element and get elementToken
            var elementDetails = lastCallbackArgs.elementDetails;
            if(elementDetails != null && elementDetails != undefined) {
                //Provision as new
                server.createInstance(ele, pageParameters.code, elementDetails.apiKey,
                    elementDetails.apiSecret, elementDetails.callbackUrl, provision.handleOnCreateInstanceCall, cbArgs);
            }
            else {
                //Provision using a Parent Token
                server.createInstanceOnParent(ele, pageParameters.code,
                    _provision.getParentTokenForElement(ele), provision.handleOnCreateInstanceCall, cbArgs)
            }
        },

        handleOnCreateInstanceCall: function(data, cbArgs) {

            _provision.setTokenToElement(cbArgs.element, data.token);

            //server.list(data.token, '/', cbArgs.cbFun, cbArgs.cbArgs);
            cbArgs.cbFun(data.token, cbArgs.cbArgs);
        }
    };

})();

var server = (function() {
    
    /**
     * Element Server private object
     * @type {Object}
     */
    _server = {

        //TODO Handle for IE CROS http://www.html5rocks.com/en/tutorials/cors/

        call: function(path, methodtype, headers, params, cb, cbArgs) {

            if(server.isNullAndUndef(methodtype))
                methodtype = 'Get';

            var proxy = $.ajax({
                url: server.getUrl(path),
                type: methodtype,
                headers: headers,
                data: params,
                //dataType: 'jsonp',
                cache: false,
                contentType: 'application/json'
            })
            .done(function(data) {
                console.log(data);
                if(server.isNullAndUndef(data.results))
                    cb(data, cbArgs);
                else
                    cb(data.results, cbArgs);

            })
            .error(function(data){
                console.log(data.status + ' error on ' + path);
                _server.handleFailure(data, cb, cbArgs);
            });
        },

        handleFailure: function(response, cb, cbArgs)
        {
            if (response.status == -1)
            {
                // This is an timeout, we can't expect an HTTP error code in the status field
                console.error('The server has not responded and ' +
                    'your request has timed out.' +
                    ' Please use your browser\'s refresh ' +
                    'button to try again. (' + response.statusText + ')');
            }
            else if (response.status == 0)
            {
                // This is a network error of some kind (connection lost for example) and
                // we can't expect an HTTP error code in the status field
                console.error('A communication error has occurred and ' +
                    'your request cannot be processed.' +
                    ' Please use your browser\'s refresh button ' +
                    'to try again. (' + response.statusText + ')');
            }
            else
            {
                if(server.isNullAndUndef(response.responseText))
                {
                    cb(response, cbArgs);
                }
                else
                {
                    console.error('The server was unable to process this request. ' +
                        'Please contact your representative. (' +
                        response.status + '/' + response.statusText + ')');
                }
            }
        }

    };

    return {

        getUrl: function(additionalParams) {
            return CloudElements.getEnvUrl() + additionalParams;
        },

        isNullAndUndef: function(variable) {
            return (variable == null || variable == undefined);
        },

        authHeader: function(uSec, oSec, eleTmplet, eleTkn) {

            var aHeader='';

            if(!this.isNullAndUndef(uSec)) {
                aHeader += 'User '+uSec;
            }

            if(!this.isNullAndUndef(oSec)) {
                aHeader += ', Organization '+oSec;
            }

            if(!this.isNullAndUndef(eleTmplet)) {
                aHeader += ', ParentElement '+eleTmplet;
            }

            if(!this.isNullAndUndef(eleTkn)) {

                if(aHeader.length > 0) {
                    aHeader += ', Element '+eleTkn;
                }
                else {
                    aHeader += 'Element '+eleTkn;
                }
            }

            return {
                "Authorization" : aHeader
            };
        },

        list: function(tkn, path, cb, cbArgs) {

            var params = {
                'path' : path
            }

            _server.call('api-v1/document/list', 'Get', this.authHeader(null, null, null, tkn), params, cb, cbArgs);
        },

        getOAuthUrlOnTemplate: function(element, prntTkn, cb, cbArgs) {

            _server.call('api-v1/provisioning/1/getOAuthUrl', 'Get',
                this.authHeader(CloudElements.getUTkn(), CloudElements.getOTkn(), prntTkn, null), null, cb, cbArgs);
        },

        getOAuthUrlOnAPIKey: function(element, apiKey, apiSec, callbackUrl, cb, cbArgs) {

            var parameters = {
                'elementKey': element,
                'apiKey' : apiKey,
                'apiSecret': apiSec,
                'callbackUrl': callbackUrl
            };

            _server.call('api-v1/provisioning/1/getOAuthUrl', 'Get',
                this.authHeader(CloudElements.getUTkn(), CloudElements.getOTkn(), null, null), parameters, cb, cbArgs);
        },

        createInstanceOnParent: function(element, code, prntTkn, cb, cbArgs) {

            var elementProvision = {
                //'provisionConfigs': provisionConfigs,
                'element': {
                    "key" : element
                },
                'name': element
            };

            var parameters = {
                'instance' : elementProvision,
                'resellerConfig': true,
                'code': code,
                'account':{
                    'key' : CloudElements.getAkey()
                }
            };

            _server.call('api-v1/provisioning/1/createAccountWithInstance', 'POST',
                this.authHeader(CloudElements.getUTkn(), CloudElements.getOTkn(), prntTkn, null), JSON.stringify(parameters), cb, cbArgs);
        },

        createInstance: function(element, code, apiKey, apiSec, callbackUrl, cb, cbArgs) {

            var elementProvision = {
                'provisionConfigs': [
                    {
                        'key' : 'oauth.api.key',
                         propertyValue : apiKey
                    },
                    {
                        'key' : 'oauth.api.secret',
                         propertyValue : apiSec
                    },
                    {
                        'key' : 'oauth.callback.url',
                        propertyValue : callbackUrl
                    }
                ],
                'element': {
                    "key" : element
                },
                'name': element
            };

            var parameters = {
                'instance' : elementProvision,
                'resellerConfig': true,
                'code': code,
                'account':{
                    'key' : CloudElements.getAkey()
                }
            };

            _server.call('api-v1/provisioning/1/createAccountWithInstance', 'POST',
                this.authHeader(CloudElements.getUTkn(), CloudElements.getOTkn(), null, null), JSON.stringify(parameters), cb, cbArgs);
        }

    }
})();
