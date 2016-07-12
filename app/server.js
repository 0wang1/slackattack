import botkit from 'botkit';
// this is es6 syntax for importing libraries
// in older js this would be: var botkit = require('botkit')// example bot
// Request API access: http://www.yelp.com/developers/getting_started/api_access


const Yelp = require('yelp');

const yelp = new Yelp({
  consumer_key: 'MCq5IY4c0J-tPmfTYUNj9w',
  consumer_secret: '53ncfQA_Ltw34Mg6l1FZqBRPhkA',
  token: 'ebiDXFgR03-pfjHt2xT70CrPoTdKpRvg',
  token_secret: 'DudJiu1MbvqIslmhk_GQBmEMLsw',
});

// See http://www.yelp.com/developers/documentation/v2/search_api
// yelp.search({ term: 'food', location: 'Montreal' })
// .then(function (data) {
//   console.log(data);
// })
// .catch(function (err) {
//   console.error(err);
// });

// See http://www.yelp.com/developers/documentation/v2/business
// yelp.business('yelp-san-francisco')
//   .then(console.log)
//   .catch(console.error);
//
// yelp.phoneSearch({ phone: '+15555555555' })
//   .then(console.log)
//   .catch(console.error);
//
// // A callback based API is also available:
// yelp.business('yelp-san-francisco', function (err, data) {
//   if (err) return console.log(error);
//   console.log(data);
// });
// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'Wassssup');
});
controller.hears(['@jamesbot', 'help'], ['direct_message', 'direct_mention'], (bot, message) => {
  bot.reply(message, 'I can greet you back if you say hello, hi, or howdy to me and provide Yelp information if you are hungry!');
});
// example hello response. Also deals with random statements
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
  bot.startConversation(message, (err, convo) => {
    convo.ask('How are you?', (response) => {
      convo.next();
      convo.say(`That's ${response.text} to hear`);
      convo.next();
    });
  });
});
//  Does a yelp search
controller.hears(['hungry', 'starving', 'food'], ['direct_message', 'direct_mention'], (bot, message) => {
  bot.startConversation(message, (err, convo) => {
    convo.ask('Would you like food recommendations near you?', [{
      pattern: bot.utterances.yes, callback: (response) => {
        convo.next();
        convo.say('Great!');
        convo.ask('What type of food are you interested in?', (respons) => {
          const food = respons.text;
          convo.next();
          convo.say('OK.');
          convo.ask('Where are you?', (respon) => {
            const loc = respon.text;
            convo.next();
            convo.say(`Alright, I will find you ${food} in ${loc}`);
            convo.say('Ok! one sec. Pulling up results.');
            convo.next();
            yelp.search({
              term: `${food}`,
              location: `${loc}`,
            }).then((data) => {
              console.log(data);
              let count = 1;
              if (data.total === 0) {
                convo.say('Sorry, there doesnt seem to be anything like that around here');
                convo.next();
                convo.completed();
              }
              convo.say('Here are the top 10 businesses I found: ');
              data.businesses.forEach(business => {
                // do something with business
                if (count < 11) {
                  const yelpAttach = {
                    text: `${business.name}`,
                    attachments: [
                      {
                        title: `${business.rating} stars and ${business.review_count} reviews`,
                        color: '#7CD197',
                        unfurl_media: true,
                        unfurl_links: true,
                        image_url: `${business.image_url}`,
                      },
                    ],
                  };
                  convo.say(yelpAttach);
                  // convo.say(`${business.name} with ${business.rating} stars and ${business.review_count} reviews`);
                  // convo.say(`${business.image_url}`);
                  count++;
                } else {
                  convo.say('I hope I found everything youre looking for!');
                  convo.err(); // Used to throw an error to break out of forEach
                }
              });
            })
            .catch((err) => {});
          });
        });
      },
    }, {
      pattern: bot.utterances.no, callback: (response) => {
        convo.next();
        convo.say('Alright then');
      },
    }, {
      default: true, callback: (response) => {
        convo.next();
        convo.say('One more time...');
        convo.repeat();
        convo.next();
      },
    }]);
  });
});
controller.hears(['wake up'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const replyWithAttachments = {
    username: 'Nemu Bot',
    text: '...5 more minutezzzz...',
    attachments: [
      {
        fallback: 'Is it time to wake up already?',
        title: 'What do you want?',
        text: 'Is it time to wake up already?',
        color: '#7CD197',
        unfurl_media: true,
        unfurl_links: true,
        image_url: 'http://i.giphy.com/b6iVj3IM54Abm.gif',
      },
    ],
    icon_emoji: ':dog:',
  };
  bot.reply(message, replyWithAttachments);
});

controller.hears([/(.*)/], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Sorry, I dont understand :(');
});

console.log('starting bot');
