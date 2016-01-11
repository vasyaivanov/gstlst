  var mongodb = require('mongodb')
  , mongoose = require('mongoose')
  , extend = require('mongoose-schema-extend')
  , bcrypt = require('bcrypt')
  , SALT_WORK_FACTOR = 10
  ;

  mongoose.connect('localhost', 'uberglist');

  var db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  db.once('open', function callback() {
    console.log('Connected to DB');
  });

  // User Schema
  var userSchema = mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true},
    password: { type: String, required: true},
    role: {type: Number}
  });

  // Bcrypt middleware
  userSchema.pre('save', function(next) {
    var user = this;
    if(!user.isModified('password')) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if(err) return next(err);

      bcrypt.hash(user.password, salt, function(err, hash) {
        if(err) return next(err);
        user.password = hash;
        next();
      });
    });
  });

  // Password verification
  userSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
      if(err) return cb(err);
      cb(null, isMatch);
    });
  };

  userSchema.index({email: 1}, {unique: true});

  /*
  // Billing
  var billingSchema =  mongoose.Schema({
    txn_id: { type: String, trim: true},
    account_type: {type: String, trim: true},
    uid: {type: String, trim: true},
    payment_gross: {type: Number},
    payment_status: {type: String, trim: true},
    payment_date: {type: Date},
    activated: {type: Number, default: 0 }
  });

  billingSchema.index({txn_id: 1, payment_status: 1, payment_gross: 1}, {unique: true});

  var Billing = mongoose.model('billing', billingSchema);

  // User subscription
  var subscriptionSchema =  mongoose.Schema({
    uid: { type: String, trim: true, required: true},
    end_date: {type: Date, required: true}
  });

  subscriptionSchema.index({uid: 1}, {unique: true});

  var Subscription = mongoose.model('subscription', subscriptionSchema);*/

  // Event schema
  var eventSchema = mongoose.Schema({
    eventId: { type: String, required: true },
    name: { type: String, required: true },
    addCount: { type: Number, default: 0 },
    created: { type: Date },
  });

  eventSchema.pre('save', function(next){
    now = new Date();
    this.created = now;
    if ( !this.created ) {
      this.created = now;
    }
    next();
  });
  eventSchema.index({eventId: 1}, {unique: true});

  // Guests schema
  var guestsSchema = mongoose.Schema({
    Name: { type: String, required: true},
    eventId: { type: String, required: true},
	  Params: {type: Object},
	  marked: {type: Number, default: 0 },
    created: { type: Date }
  });

  guestsSchema.pre('save', function(next){
    now = new Date();
    this.created = now;
    if ( !this.created ) {
      this.created = now;
    }
    next();
  });

  guestsSchema.index({Name: 1, eventId: 1}, {unique: true});


module.exports = {
  User:  mongoose.model('User', userSchema),
  Event: mongoose.model('event', eventSchema),
  Guests: mongoose.model('guest', guestsSchema)
}
