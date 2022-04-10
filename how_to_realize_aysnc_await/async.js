//  实现async,await
//  先考虑generation yield的同步版本
function * g () {
  const a = yield syncFn('hi')
  console.log('a', a)
  const b = yield syncErrorFn(a + 'sync')
  console.log('a', b)
  return b
}

function syncFn (a) {
  return a
}

function syncErrorFn (a) {
  throw (new Error(a))
}

function syncStep (gen) {
  const g = gen()
  function autoRun (property, preVal) {
    const next = g[property](preVal)

    if (next.done) {
      return next.value
    } else {
      return autoRun('next', next.value)
    }
  }
  try {
    return autoRun('next', undefined)
  } catch (error) {
    console.log('outer', error.message)
  }
}

syncStep(g)

//  实现异步版本
function * asyncG () {
  const a = yield asyncFn('hi')
  console.log('a', a)
  const b = yield asyncErrorFn(a + 'async')
  console.log('b', b)
  return b
}

function asyncFn (a) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(a)
    }, 1000)
  })
}

function asyncErrorFn (a) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(a)
    }, 500)
  })
}

function step (gen) {
  const g = gen()
  return new Promise((resolve, reject) => {
    function autoRun (property, preVal) {
      let next
      try {
        next = g[property](preVal)
      } catch (error) {
        return reject(error) //  这里reject的同时需要终止递归
      }
      if (next.done) {
        return resolve(next.value)
      }
      next.value.then((resolve) => {
        autoRun('next', resolve)
      }).catch((error) => {
        autoRun('throw', error)
      })
    }
    autoRun('next', undefined)
  })
}

step(asyncG).then((resolve) => {
  console.log('step', resolve)
}).catch((error) => {
  console.log('stepError', error)
})

//  如果这里在里面asyncG捕获异常是什么情况
function * asyncGCatch () {
  const a = yield asyncFn('hi')
  console.log('a', a)
  let b
  try {
    b = yield asyncErrorFn(a + 'async')
    console.log('b', b)
  } catch (error) {
    console.log(error)
  }
  const c = yield asyncFn(b || 'default')
  console.log('c', c)
  return c
}

step(asyncGCatch).then((resolve) => {
  console.log('stepCatch', resolve)
}).catch((error) => {
  console.log('stepCatchError', error)
})

async function canNotCatchFn () {
  try {
    //  UnhandledPromiseRejectionWarning
    // step(asyncG) //  这里会捕获不了错误，要不就是再包async,await,要不就.catch去捕获
    await step(asyncG)
  } catch (error) {
    console.log('canNotCatchFn', error)
  }
}

canNotCatchFn()

//  模拟service情况
const getEntityCatch = async () => {
  try {
    const data = await getFailEntity()
    return data
  } catch (error) {
    console.log('getEntityError', error)
  }
}
const getFailEntity = async () => {
  const data = await mockFetchData(false)
  return data
}
const getSuccessEntity = async () => {
  const data = await mockFetchData(true)
  return data
}

const mockFetchData = (success) => {
  return new Promise((resolve, reject) => {
    if (success) {
      resolve([1, 2, 3])
    } else {
      reject(new Error('fail'))
    }
  })
}

//  不相关的步骤想顺序执行
const uiNotRelativeFn = async () => {
  const data1 = await getEntityCatch()
  console.log('uiNotRelativeFn', data1)
  const data2 = await getSuccessEntity() //  注意这里抛出的错误没有被捕获
  console.log('uiNotRelativeFn', data2)
}

uiNotRelativeFn() // 如果data2抛出错误，则会捕获不到data2的错误

//  相关的步骤想顺序执行
const uiRelativeFn = async () => {
  try {
    const data1 = await getFailEntity()
    console.log('uiRelativeFn', data1)
    const data2 = await getSuccessEntity()
    console.log('uiRelativeFn', data2)
  } catch (error) {
    console.log('uiRelativeFnError', error)
  }
}

uiRelativeFn()

//  相关的步骤想顺序执行
const uiRelativeNotCatchFn = async () => {
  const data1 = await getFailEntity()
  console.log('uiRelativeNotCatchFn', data1)
  const data2 = await getSuccessEntity()
  console.log('uiRelativeNotCatchFn', data2)
}

const uiRelativeNotCatchNormalErrorFn = async () => {
  const data2 = await getSuccessEntity()
  console.log('uiRelativeNotCatchFn', data2)
  throw (new Error('sync Error'))
}

uiRelativeNotCatchFn().catch(error => {
  console.log('uiRelativeNotCatchFn', error)
})
uiRelativeNotCatchNormalErrorFn().catch(error => {
  console.log('uiRelativeNotCatchNormalErrorFn', error)
})

// promise版本
function promiseFn () {
  return asyncFn('hi')
    .then((resolve) => asyncFn(resolve + 'async'))
    .then((resolve) => asyncErrorFn(resolve))
}

promiseFn().then((resolve) => {
  console.log('promiseFn', resolve)
}).catch((error) => {
  console.log('promiseFnError', error)
})

// 自动执行promise版本
function autoRunPromiseFn (arr) {
  return new Promise((resolve, reject) => {
    function autoRun (value) {
      const promiseFn = arr.shift()
      if (!promiseFn) return resolve(value)
      promiseFn(value).then((resolve) => {
        autoRun(resolve)
      }).catch((error) => {
        reject(error)
      })
    }
    autoRun(undefined)
  })
}

autoRunPromiseFn([() => asyncFn('hi'), (resolve) => asyncFn(resolve + 'async'), (resolve) => asyncErrorFn(resolve)]).then((resolve) => {
  console.log('autoRunPromiseFn', resolve)
}).catch((error) => {
  console.log('autoRunPromiseError', error)
})

//  Iterator promise版本
const promiseNextFn = () => {
  const promiseFnArr = []
  let error = false
  return {
    next (...args) {
      const promiseFn = promiseFnArr.shift()
      if (!promiseFn || error) {
        return {
          value: args,
          done: true
        }
      }
      return {
        done: false,
        value: promiseFn(...args)
      }
    },
    setCurrentFn (fn) {
      promiseFnArr.push(fn)
    },
    throw (value) {
      error = true
      throw (new Error(value))
    }
  }
}
function promiseRunFn () {
  const g = promiseNextFn()
  g.setCurrentFn(() => {
    return asyncFn('hi')
  })
  g.setCurrentFn((resolve) => {
    return asyncFn(resolve + 'async')
  })
  g.setCurrentFn((resolve) => {
    return asyncErrorFn(resolve)
  })
  return g
}

step(promiseRunFn).then((resolve) => {
  console.log('promiseFn', resolve)
}).catch((error) => {
  console.log('promiseFnError', error.message)
})
