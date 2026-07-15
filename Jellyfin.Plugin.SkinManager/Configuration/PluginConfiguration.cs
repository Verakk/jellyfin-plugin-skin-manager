using MediaBrowser.Model.Plugins;
using System;
using System.Collections.Generic;

namespace Jellyfin.Plugin.SkinManager.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public string selectedSkin { get; set; }
        public string[] options { get; set; }

        /// <summary>
        /// When true (and the "File Transformation" plugin is installed), a Netflix-style featured
        /// hero banner is injected at the top of the home screen.
        /// </summary>
        public bool enableBanner { get; set; }

        public PluginConfiguration()
        {
            selectedSkin = "";
            options = Array.Empty<String>();
            enableBanner = true;
        }
    }
}
