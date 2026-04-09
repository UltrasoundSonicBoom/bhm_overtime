import app from '../server/src/index'

export default {
  fetch(request: Request) {
    return app.fetch(request)
  },
}
