(function(){
  var koa, koaStatic, koaRouter, koaLogger, koaBodyparser, koaJsonp, monk, prelude, kapp, app, ref$, cfy, cfy_node, yfy_node, mongourl, MongoClient, db, signups, get_native_db, list_collections, list_log_collections_for_user, list_log_collections_for_logname, get_collection_for_user_and_logname, port, slice$ = [].slice;
  process.on('unhandledRejection', function(reason, p){
    throw new Error(reason);
  });
  koa = require('koa');
  koaStatic = require('koa-static');
  koaRouter = require('koa-router');
  koaLogger = require('koa-logger');
  koaBodyparser = require('koa-bodyparser');
  koaJsonp = require('koa-jsonp');
  monk = require('monk');
  prelude = require('prelude-ls');
  kapp = koa();
  kapp.use(koaJsonp());
  kapp.use(koaLogger());
  kapp.use(koaBodyparser());
  app = koaRouter();
  ref$ = require('cfy'), cfy = ref$.cfy, cfy_node = ref$.cfy_node, yfy_node = ref$.yfy_node;
  mongourl = (ref$ = process.env.MONGODB_URI) != null ? ref$ : 'mongodb://localhost:27017/default';
  MongoClient = require('mongodb').MongoClient;
  db = monk(mongourl);
  signups = db.get('signups');
  get_native_db = cfy(function*(){
    return (yield function(it){
      return MongoClient.connect(mongourl, it);
    });
  });
  list_collections = cfy(function*(){
    var ndb, collections_list, this$ = this;
    ndb = (yield get_native_db());
    collections_list = (yield function(it){
      return ndb.listCollections().toArray(it);
    });
    return collections_list.map(function(it){
      return it.name;
    });
  });
  list_log_collections_for_user = cfy(function*(userid){
    var all_collections;
    all_collections = (yield list_collections());
    return all_collections.filter(function(it){
      return it.startsWith(userid + "_");
    });
  });
  list_log_collections_for_logname = cfy(function*(logname){
    var all_collections;
    all_collections = (yield list_collections());
    return all_collections.filter(function(it){
      return it.endsWith("_" + logname);
    });
  });
  get_collection_for_user_and_logname = function(userid, logname){
    return db.get(userid + "_" + logname);
  };
  app.get('/addsignup', function*(){
    var email, result;
    this.type = 'json';
    email = this.request.query.email;
    if (email == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter email'
      });
      return;
    }
    result = (yield signups.insert(this.request.query));
    return this.body = JSON.stringify({
      response: 'done',
      success: true
    });
  });
  app.get('/feedback', function*(){
    var feedback, collections, i$, len$, entry, collection, all_items, j$, len1$, item;
    feedback = [];
    collections = (yield list_collections());
    for (i$ = 0, len$ = collections.length; i$ < len$; ++i$) {
      entry = collections[i$];
      if (entry.indexOf('feedback') > -1) {
        collection = db.get(entry);
        all_items = (yield collection.find({}, ["feedback"]));
        for (j$ = 0, len1$ = all_items.length; j$ < len1$; ++j$) {
          item = all_items[j$];
          feedback.push(item["feedback"]);
        }
      }
    }
    this.body = JSON.stringify(feedback);
  });
  app.get('/getactiveusers', function*(){
    var users, users_set, now, secs_in_day, collections, i$, len$, entry, entry_parts, userid, logname, collection, all_items, timestamp, this$ = this;
    users = [];
    users_set = {};
    now = Date.now();
    secs_in_day = 86400000;
    collections = (yield list_collections());
    for (i$ = 0, len$ = collections.length; i$ < len$; ++i$) {
      entry = collections[i$];
      if (entry.indexOf('_') === -1) {
        continue;
      }
      entry_parts = entry.split('_');
      userid = entry_parts[0];
      logname = slice$.call(entry_parts, 1).join('_');
      if (logname.startsWith('facebook:')) {
        collection = db.get(entry);
        all_items = (yield collection.find({}, ["timestamp"]));
        timestamp = prelude.maximum(all_items.map(fn$));
        if (now - timestamp < secs_in_day) {
          if (users_set[userid] == null) {
            users.push(userid);
            users_set[userid] = true;
          }
        }
      }
    }
    this.body = JSON.stringify(users);
    function fn$(it){
      return it.timestamp;
    }
  });
  app.post('/addsignup', function*(){
    var email, result;
    this.type = 'json';
    email = this.request.body.email;
    if (email == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter email'
      });
      return;
    }
    result = (yield signups.insert(this.request.body));
    return this.body = JSON.stringify({
      response: 'success',
      success: true
    });
  });
  app.get('/getsignups', function*(){
    var all_results, x;
    this.type = 'json';
    all_results = (yield signups.find({}));
    return this.body = JSON.stringify((yield* (function*(){
      var i$, ref$, len$, results$ = [];
      for (i$ = 0, len$ = (ref$ = all_results).length; i$ < len$; ++i$) {
        x = ref$[i$];
        results$.push(x.email);
      }
      return results$;
    }())));
  });
  app.get('/list_logs_for_user', function*(){
    var userid, user_collections;
    this.type = 'json';
    userid = this.request.query.userid;
    if (userid == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter userid'
      });
      return;
    }
    user_collections = (yield list_log_collections_for_user(userid));
    return this.body = JSON.stringify(user_collections);
  });
  app.get('/list_logs_for_logname', function*(){
    var logname, user_collections;
    this.type = 'json';
    logname = this.request.query.logname;
    if (logname == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter logname'
      });
      return;
    }
    user_collections = (yield list_log_collections_for_logname(logname));
    return this.body = JSON.stringify(user_collections);
  });
  app.get('/printcollection', function*(){
    var ref$, collection, userid, logname, collection_name, items;
    ref$ = this.request.query, collection = ref$.collection, userid = ref$.userid, logname = ref$.logname;
    if (userid != null && logname != null) {
      collection = userid + "_" + logname;
    }
    if (collection == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need paramter collection'
      });
    }
    collection_name = collection;
    collection = db.get(collection_name);
    items = (yield collection.find({}));
    return this.body = JSON.stringify(items);
  });
  app.get('/listcollections', function*(){
    this.type = 'json';
    return this.body = JSON.stringify((yield list_collections()));
  });
  app.post('/sync_collection_item', function*(){
    var ref$, userid, collection, collection_name;
    this.type = 'json';
    ref$ = this.request.body, userid = ref$.userid, collection = ref$.collection;
    collection_name = collection;
    if (userid == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter userid'
      });
      return;
    }
    if (collection_name == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter collection'
      });
      return;
    }
    collection = get_collection_for_user_and_logname(userid, 'synced:' + collection_name);
    (yield collection.insert(this.request.body));
    return this.body = JSON.stringify({
      response: 'success',
      success: true
    });
  });
  app.post('/addtolog', function*(){
    var ref$, userid, logname, itemid, collection;
    this.type = 'json';
    ref$ = this.request.body, userid = ref$.userid, logname = ref$.logname, itemid = ref$.itemid;
    logname = logname.split('/').join(':');
    if (userid == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter userid'
      });
      return;
    }
    if (logname == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter logname'
      });
      return;
    }
    if (itemid == null) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'need parameter itemid'
      });
      return;
    }
    if (itemid.length !== 24) {
      this.body = JSON.stringify({
        response: 'error',
        error: 'itemid length needs to be 24'
      });
      return;
    }
    collection = get_collection_for_user_and_logname(userid, logname);
    this.request.body._id = monk.id(itemid);
    (yield collection.insert(this.request.body));
    return this.body = JSON.stringify({
      response: 'success',
      success: true
    });
  });
  kapp.use(app.routes());
  kapp.use(app.allowedMethods());
  kapp.use(koaStatic(__dirname + '/www'));
  port = (ref$ = process.env.PORT) != null ? ref$ : 5000;
  kapp.listen(port);
  console.log("listening to port " + port + " visit http://localhost:" + port);
}).call(this);
