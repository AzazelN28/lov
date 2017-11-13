import path from "path";
import webpack from "webpack";
import HtmlPlugin from "html-webpack-plugin";
import ExtractTextPlugin from "extract-text-webpack-plugin";

function src(...args) {
  return path.resolve(__dirname, "src", ...args);
}

function dist(...args) {
  return path.resolve(__dirname, "dist", ...args);
}

function nodeModules(...args) {
  return path.resolve(__dirname, "node_modules", ...args);
}

const plugins = (() => {
  const basePlugins = [
    new HtmlPlugin({
      title: "Legends of Valour",
      template: src("templates", "index.pug")
    }),
    new ExtractTextPlugin({
      filename: "index.css"
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
    })
  ];

  if (process.env.NODE_ENV === "development") {
    return basePlugins.concat([
      new webpack.HotModuleReplacementPlugin()
    ]);
  }

  return basePlugins.concat([
    new webpack.optimize.UglifyJsPlugin({
      global: true,
      mangle: true,
      compress: true
    })
  ]);

})();

const config = {
  entry: [
    src("scripts", "index.js"),
    src("styles", "index.styl")
  ],

  output: {
    path: dist(),
    filename: "index.js"
  },

  resolve: {
    alias: {
      "gl-matrix": nodeModules("gl-matrix", "dist", "gl-matrix.js")
    }
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader"
      },
      {
        test: /\.glsl$/,
        use: "shader-loader"
      },
      {
        test: /\.styl$/,
        use: ExtractTextPlugin.extract({
          use: ["css-loader","stylus-loader"]
        })
      },
      {
        test: /\.pug$/,
        use: "pug-loader"
      }
    ]
  },

  plugins,

  devtool: "source-map",

  devServer: {
    contentBase: dist(),
    compress: true,
    hot: true,
    port: 3000
  }

};

export default config;
