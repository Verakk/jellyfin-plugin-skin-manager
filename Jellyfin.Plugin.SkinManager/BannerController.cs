using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SkinManager.Controllers
{
    /// <summary>
    /// Serves the hero-banner client script at <c>/SkinManager/banner.js</c> (an embedded resource).
    /// The script tag pointing here is injected into index.html by <see cref="TransformationPatches"/>.
    /// </summary>
    [ApiController]
    [Route("SkinManager")]
    public class BannerController : ControllerBase
    {
        /// <summary>
        /// Returns the featured hero-banner JavaScript.
        /// </summary>
        [HttpGet("banner.js")]
        [Produces("application/javascript; charset=utf-8")]
        [AllowAnonymous]
        public ActionResult GetBannerScript()
        {
            var assembly = typeof(BannerController).Assembly;
            var stream = assembly.GetManifestResourceStream("Jellyfin.Plugin.SkinManager.Configuration.banner.js");
            if (stream == null)
            {
                return Content("/* SkinManager: banner.js resource missing */", "application/javascript; charset=utf-8");
            }

            using (stream)
            using (var reader = new StreamReader(stream))
            {
                return Content(reader.ReadToEnd(), "application/javascript; charset=utf-8");
            }
        }
    }
}
