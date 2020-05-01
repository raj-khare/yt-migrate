const CLIENT_ID =
  "1006418704112-vq6irgnq7tu7hkqq2meu41r08hd9d3q2.apps.googleusercontent.com";
const API_KEY = "AIzaSyAPvTCaq88eRD3G-PSIMFqnBisTXaPWBPE";

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");

//Polyfill
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map((p) =>
        Promise.resolve(p).then(
          (value) => ({
            state: "fulfilled",
            value,
          }),
          (reason) => ({
            state: "rejected",
            reason,
          })
        )
      )
    );
  };
}

const USER_DATA = {
  oldSubscriptions: new Set(),
  currentSubscriptions: new Set(),
  newSubscriptionsCount: 0,
};

gapi.load("client:auth2", () => {
  gapi.auth2.init({
    client_id: CLIENT_ID,
    fetch_basic_profile: false,
    scope: "https://www.googleapis.com/auth/youtube",
  });
});

const notify = (msg) => {
  notifications.innerHTML = msg;
};

const authenticate = () => {
  notify("Signing in...");
  return gapi.auth2
    .getAuthInstance()
    .signIn({
      scope: "https://www.googleapis.com/auth/youtube",
      prompt: "select_account",
    })
    .then(
      () => {
        notify("Sign-in successful");
      },
      (err) => {
        throw new Error("Sign-in failed. Please try again");
      }
    );
};

const loadClient = () => {
  gapi.client.setApiKey(API_KEY);
  return gapi.client
    .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    .then(null, (err) => {
      throw new Error("Error. Please try again");
    });
};

const getSubscriptions = (type, pageToken = null) => {
  notify(`Fetching your ${type} subscriptions...`);
  const userData =
    type === "old"
      ? USER_DATA.oldSubscriptions
      : USER_DATA.currentSubscriptions;
  return gapi.client.youtube.subscriptions
    .list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined,
    })
    .then(
      (response) => {
        response.result.items.forEach((element) => {
          userData.add(element.snippet.resourceId.channelId);
        });
        nextPage = response.result.nextPageToken;
        if (nextPage)
          return getSubscriptions(
            type,
            (pageToken = response.result.nextPageToken)
          );
        else {
          notify("Subscriptions fetched successfully");
        }
      },
      (err) => {
        throw new Error("Error fetching data. Please try again");
      }
    );
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  promises = [];
  USER_DATA.oldSubscriptions.forEach((el) => {
    if (!USER_DATA.currentSubscriptions.has(el)) {
      // New subscription
      USER_DATA.newSubscriptionsCount += 1;
      promises.push(
        gapi.client.youtube.subscriptions.insert({
          part: "snippet",
          resource: {
            snippet: {
              resourceId: {
                kind: "youtube#channel",
                channelId: el,
              },
            },
          },
        })
      );
    }
  });
  return Promise.allSettled(promises);
};

signinOldAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinOldAccount.remove())
    .then(() => getSubscriptions("old"))
    .then(() => {
      notify(
        "Old subscriptions fetched successfully. Please sign in with your new account"
      );
      let content = `| ${USER_DATA.oldSubscriptions.size} subscriptions |`;
      oldData.innerHTML = content;
    })
    .then(() => signinNewAccount.classList.remove("d-none"))
    .catch((err) => {
      notify(err);
    });
};

signinNewAccount.onclick = () => {
  authenticate()
    .then(loadClient)
    .then(() => signinNewAccount.remove())
    .then(() => notify("Signed in with new account"))
    .then(() => transfer.classList.remove("d-none"))
    .then(() => getSubscriptions("current"))
    .then(() => notify("Current subscriptions fetched successfully!"))
    .catch((err) => {
      notify(err);
    });
};

transfer.onclick = () => {
  let numSubscriptions = 0;
  transferSubscriptions()
    .then((results) => {
      results.forEach((result, num) => {
        if (result.status == "fulfilled") {
          numSubscriptions += 1;
        }
      });
    })
    .then(() => {
      console.log(numSubscriptions, USER_DATA.newSubscriptionsCount);
      if (numSubscriptions === USER_DATA.newSubscriptionsCount)
        notify(
          `${numSubscriptions}/${USER_DATA.newSubscriptionsCount} new subscriptions transferred successfully!`
        );
      else
        notify(
          `${numSubscriptions}/${USER_DATA.newSubscriptionsCount} new subscriptions transferred. You may have exhausted the quota. Please try remaining tomorrow`
        );
    })
    .catch((err) => {
      notify("Error. Please try again");
    });
};
