/**
 * Axios 请求配置
 */

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 可以在这里添加 token
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error: AxiosError) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 统一处理响应数据
    const { data } = response

    // 如果后端返回的是标准格式 { success, data, message }
    if (data.success !== undefined) {
      return data
    }

    // 否则直接返回数据
    return data
  },
  (error: AxiosError<any>) => {
    // 统一错误处理
    let message = '请求失败'

    if (error.response) {
      // 服务器返回错误
      const { status, data } = error.response

      switch (status) {
        case 400:
          message = data?.error?.message || '请求参数错误'
          break
        case 401:
          message = '未授权，请登录'
          // 可以在这里跳转到登录页
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = data?.error?.message || '请求的资源不存在'
          break
        case 500:
          message = data?.error?.message || '服务器错误'
          break
        default:
          message = data?.error?.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      message = '网络错误，请检查网络连接'
    } else {
      // 请求配置出错
      message = error.message || '请求配置错误'
    }

    console.error('响应错误:', message, error)

    // 返回统一的错误格式
    return Promise.reject({
      success: false,
      message,
      error: error.response?.data?.error,
    })
  }
)

export default request
