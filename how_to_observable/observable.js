class Observable {
  constructor (fn) {
    this.fn = fn
  }

  subscribe ({ next, err, complete }) {
    return this.fn({ next, err, complete })
  }

  map (fn) {
    return new Observable((subscriber) => {
      this.subscribe({
        next: (val) => subscriber.next(fn(val)),
        complete: () => subscriber.complete()
      })
    })
  }
}

const ob = new Observable((subscriber) => {
  subscriber.next('1')
  subscriber.complete()
})

ob
  .map((x) => {
    console.log('map', x)
    return x * 2
  })
  .subscribe({
    next: (value) => console.log(value),
    complete: () => console.log('complete')
  })
