using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.SkinManager
{
    /// <summary>
    /// Registers the hosted service that wires the featured hero banner into jellyfin-web.
    /// Jellyfin discovers this automatically by scanning plugin assemblies for
    /// <see cref="IPluginServiceRegistrator"/> implementations.
    /// </summary>
    public class PluginServiceRegistrator : IPluginServiceRegistrator
    {
        /// <inheritdoc />
        public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
        {
            serviceCollection.AddHostedService<BannerInjectionService>();
        }
    }
}
