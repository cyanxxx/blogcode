// 一般的回调
// let result
// function normalCb(cb) {
//   cb(result)
// }
// result = 'success'
// normalCb(console.log)

// 有错误的回调
// let result
// let error
// const PENDING = 0;
// const FULFILLED = 1;
// const REJECTED = 2;
// let state = PENDING
// function normalErrorCb(cb, errorCb) {
//   switch(state) {
//     case FULFILLED: {
//       return cb(result)
//     }
//     case REJECTED: {
//       return errorCb(error)
//     }
//     default: {
//       console.log('pending...')
//     }
//   }
// }
// function setStatus(status, param) {
//   switch(status) {
//     case FULFILLED: {
//       state = FULFILLED
//       result = param
//       break
//     }
//     case REJECTED: {
//       state = REJECTED
//       error = param
//       break
//     }
//     default: {
//       console.log('pending...')
//     }
//   }
// }

// setStatus(FULFILLED, 'success')
// normalErrorCb(console.log, console.error)

//  状态只能改变一次，异步调用，并能接受多个回调
// let result
// let error
// const PENDING = 0
// const FULFILLED = 1
// const REJECTED = 2
// let state = PENDING
// let done = false
// const handlers = []
// function normalErrorCb (cb, errorCb) {
//   setTimeout(() => {
//     switch (state) {
//       case FULFILLED: {
//         return cb(result)
//       }
//       case REJECTED: {
//         return errorCb(error)
//       }
//       case PENDING: {
//         return handlers.push({ cb, errorCb })
//       }
//       default: {
//         console.log('wrong status')
//       }
//     }
//   }, 0)
// }

// function setStatus (status, param) {
//   if (done) return
//   switch (status) {
//     case FULFILLED: {
//       done = true
//       state = FULFILLED
//       result = param
//       handlers.forEach((handler) => handler.cb(result))
//       break
//     }
//     case REJECTED: {
//       done = true
//       state = REJECTED
//       error = param
//       handlers.forEach((handler) => handler.errorCb(error))
//       break
//     }
//     default: {
//       console.log('pending...')
//     }
//   }
// }

// normalErrorCb(console.log, console.error)
// setStatus(FULFILLED, 'success')
// setStatus(REJECTED, 'error')
// normalErrorCb(console.log.bind(undefined, 'one more'), console.error)

// //  我们声明了很多东西在全局作用域，我们应该把他包起来
// function MockPromise (fn) {
//   let result
//   let error
//   const PENDING = 0
//   const FULFILLED = 1
//   const REJECTED = 2
//   let state = PENDING
//   let done = false
//   const handlers = []
//   this.then = function normalErrorCb (cb, errorCb) {
//     setTimeout(() => {
//       switch (state) {
//         case FULFILLED: {
//           return cb(result)
//         }
//         case REJECTED: {
//           return errorCb(error)
//         }
//         case PENDING: {
//           return handlers.push({ cb, errorCb })
//         }
//         default: {
//           console.log('wrong status')
//         }
//       }
//     }, 0)
//   }

//   function setStatus (status, param) {
//     if (done) return
//     switch (status) {
//       case FULFILLED: {
//         done = true
//         state = FULFILLED
//         result = param
//         handlers.forEach((handler) => handler.cb(result))
//         break
//       }
//       case REJECTED: {
//         done = true
//         state = REJECTED
//         error = param
//         handlers.forEach((handler) => handler.errorCb(error))
//         break
//       }
//       default: {
//         console.log('pending...')
//       }
//     }
//   }

//   fn(resolve, reject)

//   function resolve (successValue) {
//     setStatus(FULFILLED, successValue)
//   }
//   function reject (error) {
//     setStatus(REJECTED, error)
//   }
//   // 怎么暴露这个方法呢？一方面可以像then一样直接暴露，但也有这种通过构造函数的时候暴露出去，而这个resolve,reject将会有机会被外部改变
//   // this.resolve = function (successValue) {
//   //   setStatus(FULFILLED, successValue)
//   // }
//   // this.reject = function (error) {
//   //   setStatus(REJECTED, error)
//   // }
// }

// const p = new MockPromise((resolve, reject) => {
//   setTimeout(() => {
//     resolve('success')
//     reject('error')
//   }, 500)
// })
// p.then(console.log, console.error)

//  实现链式调用
function MockPromise (fn) {
  let result
  let error
  const PENDING = 0
  const FULFILLED = 1
  const REJECTED = 2
  let state = PENDING
  let done = false
  const handlers = []
  this.then = function normalErrorCb (cb, errorCb) {
    return new MockPromise((resolve, reject) => {
      setTimeout(() => {
        switch (state) {
          case FULFILLED: {
            const cbValue = cb(result) //  这里的cb返回值还是promise怎么办？这里的的resolve应该是等返回的promise结束后
            return resolve(cbValue)
          }
          case REJECTED: {
            const errorValue = errorCb(error)
            reject(errorValue)
            return errorValue
          }
          case PENDING: {
            return handlers.push({ cb, errorCb })
          }
          default: {
            console.log('wrong status')
          }
        }
      }, 0)
    })
  }

  function setStatus (status, param) {
    if (done) return
    switch (status) {
      case FULFILLED: {
        done = true
        state = FULFILLED
        result = param
        handlers.forEach((handler) => handler.cb(result))
        break
      }
      case REJECTED: {
        done = true
        state = REJECTED
        error = param
        handlers.forEach((handler) => handler.errorCb(error))
        break
      }
      default: {
        console.log('pending...')
      }
    }
  }

  fn(resolve, reject)

  // function resolve (successValue) { // 默认是普通值直接传递给cb了
  //   setStatus(FULFILLED, successValue)
  // }
  function resolve (successValue) {
    const t = typeof successValue
    if (t === 'object' || t === 'function') {
      const then = successValue.then
      if (typeof then === 'function') {
        then((result) => {
          resolve(result)
        }, (error) => {
          reject(error)
        })
      }
    } else {
      setStatus(FULFILLED, successValue)
    }
  }
  function reject (error) {
    setStatus(REJECTED, error)
  }
}

const p = new MockPromise((resolve, reject) => {
  resolve('success')
  reject('error')
})
p.then((result) => {
  console.log(result)
  return new MockPromise((resolve, reject) => {
    resolve('otherSuccess')
  })
}, console.error).then(console.log, console.error)
