//  实现async,await
//  先考虑generation yield的同步版本
function* g() {
    const a = yield syncFn('hi')
    console.log('a', a)
    const b = yield syncErrorFn(a + 'sync')
    console.log('a', b)
    return b
}

function syncFn(a) {
    return a 
}

function syncErrorFn(a) {
    throw(new Error(a))
}

function syncStep(gen) {
    const g = gen()
    function autoRun(property, preVal) {
        let next;
        next = g[property](preVal)
        
        if(next.done) {
            return next.value
        }else{
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
function* asyncG() {
    const a = yield asyncFn('hi')
    console.log('a', a)
    const b = yield asyncErrorFn(a + 'async')
    debugger
    console.log('b', b)
    return b    
}

function asyncFn(a) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(a)
        },1000)
    })
}

function asyncErrorFn(a) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(a)
        },500)
    })
}

function step(gen) {
    const g = gen()
    return new Promise((resolve, reject) => {
        function autoRun(property, preVal) {
            let next;
            try {
                next = g[property](preVal)
                debugger
            } catch (error) {
                return reject(error)    //  这里reject的同时需要终止递归
            }
            if(next.done) {
                return resolve(next.value)
            }
            next.value.then((resolve) => {
                autoRun("next", resolve)
            }).catch((error) => {
                autoRun("throw", error)
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

// promise版本
function promiseFn() {
    return asyncFn("hi")
    .then((resolve) => asyncFn(resolve + "async"))
    .then((resolve) => asyncErrorFn(resolve))
}

promiseFn().then((resolve) => {
    console.log('promiseFn', resolve)
}).catch((error) => {
    console.log('promiseFnError', error)
})

// 自动执行promise版本
function autoRunPromiseFn(arr) {
    return new Promise((resolve, reject) => {
        function autoRun(value) {
            const promiseFn = arr.shift()
            debugger
            if(!promiseFn)return resolve(value)
            promiseFn(value).then((resolve) => {
                autoRun(resolve)
            }).catch((error) => {
                reject(error)
            })
        }
        autoRun(undefined)
    })
}

autoRunPromiseFn([() => asyncFn("hi"), (resolve) => asyncFn(resolve + "async"), (resolve) => asyncErrorFn(resolve)]).then((resolve) => {
    console.log('autoRunPromiseFn', resolve)
}).catch((error) => {
    console.log('autoRunPromiseError', error)
})

//  Iterator promise版本
const promiseNextFn = () => {
    let promiseFnArr = []
    let error = false
    return {
        next(...args){
            const promiseFn = promiseFnArr.shift()
            if(!promiseFn || error){
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
        setCurrentFn(fn){
            promiseFnArr.push(fn)
        },
        throw(value){
            error = true
            throw(new Error(value))
         }
    }
}
function promiseRunFn() {
    const g = promiseNextFn()
    g.setCurrentFn(() => {
        return asyncFn("hi")
    })
    g.setCurrentFn((resolve) => {
        return asyncFn(resolve + "async")
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
