import path from 'path'
import webpack from 'webpack'

const config = {
  projectName: 'skilflow',
  date: '2026-5-9',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {
    'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
  },
  copy: {
    patterns: [],
    options: {}
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  mini: {
    postcss: {
      pxtransform: { enable: true, config: {} },
      url: { enable: true, config: { limit: 1024 } },
      cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } }
    },
    webpackChain(chain) {
      chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'))
      chain.plugin('provide-process')
        .use(webpack.ProvidePlugin, [{ process: 'process/browser' }])
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      pxtransform: {
        enable: false,  // H5 端关闭 px→rem，用纯 CSS 响应式
      },
      autoprefixer: { enable: true, config: {} },
      cssModules: { enable: false, config: { namingPattern: 'module', generateScopedName: '[name]__[local]___[hash:base64:5]' } }
    },
    router: { mode: 'hash' },
    devServer: { port: 10086, host: '0.0.0.0' },
    webpackChain(chain) {
      chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'))
      chain.plugin('provide-process')
        .use(webpack.ProvidePlugin, [{ process: 'process/browser' }])
      chain.resolve.fallback = {
        ...chain.resolve.fallback,
        process: require.resolve('process/browser')
      }
    }
  }
}

export default function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev').default)
  }
  return merge({}, config, require('./prod').default)
}
