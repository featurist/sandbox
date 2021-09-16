let { join } = require('path')
let { spawn } = require('child_process')
let sandbox = require('../../../../src')
let { url } = require('./_lib')
let tiny = require('tiny-json-http')
let mock = join(process.cwd(), 'test', 'mock')
let quiet = true
let child

// Verify sandbox shut down
let verifyShutdown = (t, type) => {
  tiny.get({ url }, err => {
    if (err) {
      let errs = [ 'ECONNREFUSED', 'ECONNRESET' ]
      delete process.env.ARC_QUIET // Must be reset on shutdown so we can verify binary startup
      t.ok(errs.includes(err.code), `Sandbox succssfully shut down (${type})`)
    }
    else t.fail('Sandbox did not shut down')
  })
}

let startup = {
  module: (t, mockDir) => {
    sandbox.start({
      cwd: join(mock, mockDir),
      quiet,
    }, (err, result) => {
      if (err) t.fail(err)
      else {
        t.equal(process.env.ARC_HTTP, 'aws_proxy', 'aws_proxy mode enabled')
        t.equal(result, 'Sandbox successfully started', 'Sandbox started (module)')
      }
    })
  },
  binary: (t, mockDir) => {
    if (child) throw Error('Unclean test env, found hanging child process!')

    let cwd = join(mock, mockDir)
    child = spawn(`${process.cwd()}/bin/sandbox-binary`, [], { cwd })
    t.ok(child, 'Sandbox child process started')
    let data = ''
    let started = false
    child.stdout.on('data', chunk => {
      data += chunk.toString()
      if (data.includes('Sandbox Started in') && !started) {
        started = true
        if (!quiet) { console.log(data) }
        t.pass('Sandbox started (binary)')
      }
    })
    child.stderr.on('data', chunk => {
      data += chunk.toString()
      if (!quiet) { console.log(data) }
    })
  }
}

let shutdown = {
  module: t => {
    sandbox.end((err, result) => {
      if (err) t.fail(err)
      if (result !== 'Sandbox successfully shut down') {
        t.fail('Did not get back Sandbox shutdown message')
      }
      verifyShutdown(t, 'module')
    })
  },
  binary: t => {
    child.kill('SIGINT')
    child = undefined
    verifyShutdown(t, 'binary')
  }
}

let shutdownAsync = {
  module: async t => {
    let result = await sandbox.end()
    if (result !== 'Sandbox successfully shut down') {
      t.fail('Did not get back Sandbox shutdown message')
    }
    try {
      await tiny.get({ url })
      t.fail('Sandbox did not shut down')
    }
    catch (err) {
      verifyShutdown(t, err, 'module')
    }
  },

}

module.exports = {
  verifyShutdownNew: verifyShutdown,
  startupNew: startup,
  shutdownNew: shutdown,
  shutdownAsyncNew: shutdownAsync,
}