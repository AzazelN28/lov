const path = require("path");
const webpack = require("webpack");
const HtmlPlugin = require("html-webpack-plugin");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {

  entry: [
    path.resolve(__dirname, "src", "scripts", "index.js"),
    path.resolve(__dirname, "src", "styles", "index.styl")
  ],

  output: {
    path: path.resolve(__dirname, "dist")
  },

  resolve: {
    alias: {
      "gl-matrix": path.resolve(__dirname, "node_modules", "gl-matrix", "dist", "gl-matrix.js")
    }
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["latest"]
          }
        }
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

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlPlugin({
      title: "Legends of Valour",
      template: path.resolve(__dirname, "src", "templates", "index.pug")
    }),
    new ExtractTextPlugin({
      filename: "index.css"
    })
  ],

  devtool: "source-map",

  devServer: {
    contentBase: path.resolve(__dirname, "dist"),
    hot: true,
    port: 3000
  }

};
