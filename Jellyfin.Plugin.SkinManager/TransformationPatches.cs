using System;

namespace Jellyfin.Plugin.SkinManager
{
    /// <summary>
    /// Callback invoked by the File Transformation plugin for every index.html request. It inserts
    /// the hero-banner script tag just before &lt;/body&gt; when the banner is enabled. The parameter
    /// is typed as <see cref="object"/> and read via reflection because File Transformation runs in a
    /// separate assembly load context (its payload type cannot be referenced directly).
    /// </summary>
    public static class TransformationPatches
    {
        /// <summary>
        /// Transforms the served index.html. Must be public and static; its fully-qualified name is
        /// what BannerInjectionService registers as the callback.
        /// </summary>
        public static string IndexHtml(object payload)
        {
            var contentsProperty = payload == null ? null : payload.GetType().GetProperty("contents");
            var contents = contentsProperty == null ? null : Convert.ToString(contentsProperty.GetValue(payload));
            if (string.IsNullOrEmpty(contents))
            {
                return contents ?? string.Empty;
            }

            var config = Plugin.Instance == null ? null : Plugin.Instance.Configuration;
            if (config == null || !config.enableBanner)
            {
                return contents;
            }

            const string marker = "/SkinManager/banner.js";
            if (contents.Contains(marker))
            {
                return contents;
            }

            var version = Plugin.Instance.Version == null ? "1" : Plugin.Instance.Version.ToString();
            var scriptTag = "<script defer src=\"/SkinManager/banner.js?v=" + version + "\"></script>";

            var bodyIndex = contents.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if (bodyIndex < 0)
            {
                return contents + scriptTag;
            }

            return contents.Substring(0, bodyIndex) + scriptTag + contents.Substring(bodyIndex);
        }
    }
}
