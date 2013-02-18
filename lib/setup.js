var configuration = require('./configuration').configuration;

exports = module.exports = function(identifier, done) {
  console.log('OpenID Discovery...');
  console.log('  identifer: ' + identifier);
  
  exports.discovery(identifier, function(err, issuer) {
    if (err) { return done(err); }
    
    exports.configuration(issuer, function(err, config) {
      if (err) { return done(err); };
      
      console.log('CONFIG:');
      console.log(config);
    });
  });
}


var discoverers = [];
var configurers = [];

exports.discovery = function(identifier, done) {
  if (typeof identifier === 'function') {
    return discoverers.push(identifier);
  }

  var stack = discoverers;
  (function pass(i, err, issuer) {
    // NOTE: `err` is ignored so that fallback discovery mechanisms will be
    //       attempted.
    if (err) {
      console.log('discovery attempt failed...');
      console.log(err);
    }
    // issuer was obtained, done
    if (issuer) { return done(null, issuer); }
    
    var layer = stack[i];
    if (!layer) {
      return done(new Error('Failed to discover OpenID Connect provider'));
    }
    
    try {
      layer(identifier, function(e, is) { pass(i + 1, e, is); } )
    } catch (ex) {
      return done(ex);
    }
  })(0);
}

exports.configuration = function(issuer, done) {
  if (typeof issuer === 'function') {
    return configurers.push(issuer);
  }
  
  var stack = configurers;
  (function pass(i, err, config) {
    // error or config was obtained, done
    if (err || config) { return done(err, config); }
    
    var layer = stack[i];
    if (!layer) {
      // Locally-implemented methods of loading configuration did not obtain a
      // result.  Proceed to protocol-defined mechanisms in an attempt to
      // discover the provider's configuration.
      return configuration(issuer, done);
    }
    
    try {
      layer(issuer, function(e, c) { pass(i + 1, e, c); } )
    } catch (ex) {
      return done(ex);
    }
  })(0);
}