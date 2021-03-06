/*
 * Licensed to Jasig under one or more contributor license
 * agreements. See the NOTICE file distributed with this work
 * for additional information regarding copyright ownership.
 * Jasig licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
exports.states = {
    INCLUDED    : "Included",
    INITIALIZED : "Initialized",
    LOADING     : "Loading",
    COMPLETE    : "Complete",
    HIDDEN      : "Hidden"
};

exports.events = {
    STATE_CHANGE    : 'PortalCollectionViewStateChange'
};

var _state, _folders, portletListViewsByFolder = {}, view, activeFolder,
localDictionary, styles, deviceProxy, _, app, portalProxy, rowContainer;

exports.open = function () {
    Ti.API.debug('exports.open() in PortalFolderView');
    styles = require('/js/style');
    deviceProxy = require('/js/models/DeviceProxy');
    localDictionary = require('/js/localization');
    _ = require('/js/libs/underscore-min');
    app = require('/js/Constants');
    portalProxy = require('/js/models/PortalProxy');
    
    if (!view) view = Titanium.UI.createView(styles.portalFolderView);
};

exports.close = function () {
    
};

exports.rotate = function (orientation, specialLayout) {

};

function showPortletsByFolder (folderId, force) {
    Ti.API.debug('showPortletsByFolder in PortalFolderView. folderId: '+folderId+' and activeFolder: '+activeFolder);
    if (folderId === activeFolder && !force) return;
    activeFolder = folderId;
    
    for (var _view in portletListViewsByFolder) {
        if (portletListViewsByFolder.hasOwnProperty(_view)) {
            portletListViewsByFolder[_view].height = 0;
            portletListViewsByFolder[_view].hide();
        }
    }
    if (folderId in portletListViewsByFolder) {
        portletListViewsByFolder[folderId].height = 'auto';
        portletListViewsByFolder[folderId].show();
    }
    else {
        portletListViewsByFolder[_folders[0].id].height = 'auto';
        portletListViewsByFolder[_folders[0].id].show();
        activeFolder = _folders[0].id;
    }
}
function onFolderClick (e) {
    Ti.API.debug('onFolderClick() in PortalFolderView. folderId:'+e.source.folderId);
    if (e.source.folderId) showPortletsByFolder(e.source.folderId);
}

function onPortletClick(e) {
    Ti.API.debug('onPortletClick() in PortalFolderView. portlet fname:'+e.source.portlet.fname);

    if (e.source.portlet.url) {
        Ti.App.fireEvent(app.events['SHOW_PORTLET'], e.source.portlet);
    }
    else {
        Ti.App.fireEvent(app.events['SHOW_WINDOW'], { newWindow: e.source.portlet.fname });
    }
}

function updateFolderListView(folders, activeFolderId) {
    exports.setState(exports.states['LOADING']);
    
    //Remove all current views
    if (rowContainer) view.remove(rowContainer);
    rowContainer = Ti.UI.createScrollView(styles.portalRowContainer);
    view.add(rowContainer);
    
    portletListViewsByFolder = {};
    
    i = 0;
    l = folders.length;
    
    while (i++ != l) {
        _folderHeaderView = Ti.UI.createView(styles.portalFolderHeader);
        _folderHeaderView.folderId = folders[i-1].id;
        _folderHeaderView.addEventListener('singletap', onFolderClick);
        rowContainer.add(_folderHeaderView);
        
        _folderLabel = Ti.UI.createLabel(styles.portalFolderLabel);
        _folderLabel.text = folders[i-1].title;
        
        _folderHeaderView.add(_folderLabel);
        
        //If this folder is supposed to be collapsed right now, let's continue the loop.
        // if (folders[i-1].id != activeFolderId || (!activeFolderId && i != 1)) continue;
        
        var _folderPortletsView = Ti.UI.createView({
            layout: 'vertical',
            height: (styles.portletRow.rawHeight * folders[i-1].numChildren) + 'dp',
            parentFolderId: folders[i-1].id
        });
        rowContainer.add(_folderPortletsView);
        
        portletListViewsByFolder[folders[i-1].id] = _folderPortletsView;
        
        j = 0;
        var _portlets = portalProxy.getPortlets(folders[i-1].id === 'no_folders' ? '' : folders[i-1].id), p = _portlets.length;

        while (j++ != p) {
            var _portletRow = Ti.UI.createView(styles.portletRow);
            _portletRow.portlet = _portlets[j-1];
            
            _portletRow.addEventListener('singletap', onPortletClick);
            
            _folderPortletsView.add(_portletRow);
            
            var _portletLabel = Ti.UI.createLabel(styles.portletRowLabel);
            _portletLabel.text = _portlets[j-1].title;
            _portletRow.add(_portletLabel);
            
            var _portletIcon = Ti.UI.createImageView(styles.portletRowIcon);
            _portletIcon.image = portalProxy.getIconUrl(_portlets[j-1]);
            _portletRow.add(_portletIcon);
            
            if (_portlets[j-1].newItemCount && _portlets[j-1].newItemCount > 0) {
                var _portletBadgeBackground = Ti.UI.createImageView(styles.portletRowBadgeBackground);
                var _portletBadgeNumber = Ti.UI.createLabel(styles.portletRowBadgeNumber);
                _portletBadgeNumber.text = _portlets[j-1].newItemCount;
                _portletBadgeBackground.add(_portletBadgeNumber);
                _portletRow.add(_portletBadgeBackground);   
            }
            
            var _arrow = Ti.UI.createImageView(styles.portletRowArrow);
            _portletRow.add(_arrow);
        }
    }
    
    showPortletsByFolder(activeFolder || folders[0].id, true);
    
    exports.setState(exports.states['COMPLETE']);
}

exports.updateModules = function (portlets) {
    Ti.API.debug('updateModules() in PortalFolderView');
    //This method will be called whenever new portlets are loaded. 
    //The current view should be updated, but it should stay in the current context
    _folders = portalProxy.getFolderList();
    if (_folders.length === 0) _folders = [{id:'no_folders', title: localDictionary.home, numChildren: portalProxy.getPortlets().length}];
    Ti.API.debug('folders: '+JSON.stringify(_folders));
    updateFolderListView(_folders);
};

exports.getView = function () {
    return view;
};

exports.getState = function () {
    return _state;
};

exports.setState = function (newState) {
    _state = newState;
    Ti.App.fireEvent(exports.events['STATE_CHANGE'], {state: _state});
};
