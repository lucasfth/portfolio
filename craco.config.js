module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      return webpackConfig;
    },
  },
  devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
    // Completely override the dev server config to remove deprecated options
    return {
      ...devServerConfig,
      // Remove any deprecated options
      onAfterSetupMiddleware: undefined,
      onBeforeSetupMiddleware: undefined,
      // Use the new setupMiddlewares instead
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }
        return middlewares;
      },
      // Keep other important settings
      host: 'localhost',
      port: 3000,
      historyApiFallback: true,
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*',
      },
    };
  },
};
