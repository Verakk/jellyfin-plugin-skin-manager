using System;
using System.Linq;
using System.Runtime.Loader;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.SkinManager
{
    /// <summary>
    /// On startup, registers an index.html transformation with the "File Transformation" plugin so
    /// the featured hero-banner script gets injected into jellyfin-web. The registration is done via
    /// reflection because File Transformation is loaded into a different assembly load context and
    /// cannot be referenced directly. If File Transformation isn't installed this is a no-op (the
    /// banner simply doesn't appear).
    /// </summary>
    public class BannerInjectionService : IHostedService
    {
        private readonly ILogger<BannerInjectionService> _logger;

        public BannerInjectionService(ILogger<BannerInjectionService> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                var ftAssembly = AssemblyLoadContext.All
                    .SelectMany(ctx => ctx.Assemblies)
                    .FirstOrDefault(asm => asm.FullName != null && asm.FullName.Contains(".FileTransformation"));

                if (ftAssembly == null)
                {
                    _logger.LogInformation("SkinManager: 'File Transformation' plugin not found. Install it to enable the featured hero banner on the home screen.");
                    return Task.CompletedTask;
                }

                var pluginInterface = ftAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
                var register = pluginInterface == null ? null : pluginInterface.GetMethod("RegisterTransformation");
                if (register == null)
                {
                    _logger.LogWarning("SkinManager: could not locate FileTransformation.PluginInterface.RegisterTransformation; hero banner disabled.");
                    return Task.CompletedTask;
                }

                var payload = new
                {
                    id = Plugin.Instance.Id,
                    fileNamePattern = "^index\\.html$",
                    callbackAssembly = typeof(TransformationPatches).Assembly.FullName,
                    callbackClass = typeof(TransformationPatches).FullName,
                    callbackMethod = nameof(TransformationPatches.IndexHtml)
                };

                register.Invoke(null, new object[] { payload });
                _logger.LogInformation("SkinManager: registered index.html transformation for the featured hero banner.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SkinManager: failed to register the File Transformation hook for the hero banner.");
            }

            return Task.CompletedTask;
        }

        /// <inheritdoc />
        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
