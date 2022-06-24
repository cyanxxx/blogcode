// 1. 数组
function arrayPattern () {
  const middleware = []
  function output (...args) {
    console.log(...args)
  }
  function use (fn) {
    middleware.push(fn)
  }
  function input (...args) {
    middleware.forEach(m => m(...args))
    output(...args)
  }

  use(x => { x.data += 1 })
  input({ data: 1 })
}
arrayPattern()

// 1.1 加入next控制
function nextPlus () {
  const middleware = []
  function use (...fn) {
    middleware.push(...fn)
  }
  function input (...args) {
    function iterator (index) {
      if (index === middleware.length) return
      return middleware[index](...args, () => iterator(index + 1))
    }
    iterator(0)
    output(...args)
  }
  function output (...args) {
    console.log(...args)
  }
  use((ctx, next) => { ctx.data += 1; next() }, (ctx, next) => { ctx.data *= 2; next() })
  input({ data: 1 })
}
nextPlus()

// 1.2 with err
function noNextPlus () {
  const middleware = []
  function use (...fn) {
    middleware.push(...fn)
  }
  function input (...args) {
    function iterator (index) {
      if (index === middleware.length) return
      return middleware[index](...args, () => iterator(index + 1))
    }
    iterator(0)
    output(...args)
  }
  function output (...args) {
    console.log(...args)
  }
  use((ctx, next) => { ctx.data += 1 }, (ctx, next) => { ctx.data *= 2; next() })
  input({ data: 1 })
}
noNextPlus()

// 2.增强Input，需要注意的是，是先执行最新的再执行旧的
function decorateInput () {
  function input (...args) {
    output(...args)
  }
  function output (...args) {
    console.log(...args)
  }
  function composeInput (fn, input) {
    return fn.reduce((pre, cur) => (...args) => {
      pre(cur(...args))
    }, input)
  }
  composeInput([x => x + 1], input)(1)
  composeInput([x => x + 1, x => x * 2], input)(1)
}
decorateInput()

// 3. 直接把input也传进去，并且返回函数而不是直接执行,此时最外层的函数是旧的，所以会旧的最先得到参数，然后再执行新的函数
function inputWithFun () {
  function input (...args) {
    output(...args)
  }
  function output (...args) {
    console.log(...args)
  }
  function composeInputBoth (fn) {
    return fn.reduce((pre, cur) => (...args) => pre(cur(...args)))
  }
  composeInputBoth([input => x => input(x + 1), input => x => input(x * 2)])(input)(1)

  // 4.调整输入可以接受函数或一般值
  composeInputBoth([input => x => typeof x === 'function' ? input(x() + 1) : input(x + 1), input => x => input(x * 2)])(input)(() => 1)
}
inputWithFun()
