// Error, Disable Btn, Subs
const CLIENT_ID =
  "1006418704112-vq6irgnq7tu7hkqq2meu41r08hd9d3q2.apps.googleusercontent.com";
const API_KEY = "AIzaSyAPvTCaq88eRD3G-PSIMFqnBisTXaPWBPE";

const signinOldAccount = document.getElementById("signin-old");
const signinNewAccount = document.getElementById("signin-new");
const notifications = document.getElementById("notifications");
const transfer = document.getElementById("transfer");
const oldData = document.getElementById("old-data");
const completed = document.getElementById("completed");
const remaining = document.getElementById("remaining");
const already = document.getElementById("already");
const stats = document.getElementById("stats");

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
  oldSubscriptions: {},
  currentSubscriptions: {},
  alreadyInAccount: {},
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
  notifications.textContent = msg;
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
        throw new Error(err.error);
      }
    );
};

const loadClient = () => {
  gapi.client.setApiKey(API_KEY);
  return gapi.client
    .load("https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest")
    .then(null, () => {
      throw new Error("Client loading failed. Please try again");
    });
};

const getSubscriptions = async (type, pageToken = null) => {
  notify(`Fetching your ${type} subscriptions...`);
  try {
    const userData =
      type === "old"
        ? USER_DATA.oldSubscriptions
        : USER_DATA.currentSubscriptions;
    const response = await gapi.client.youtube.subscriptions.list({
      part: "snippet",
      mine: true,
      maxResults: 50,
      pageToken: pageToken ? pageToken : undefined,
    });
    response.result.items.forEach((element) => {
      userData[element.snippet.resourceId.channelId] = element.snippet.title;
    });
    nextPage = response.result.nextPageToken;
    if (nextPage)
      await getSubscriptions(type, (pageToken = response.result.nextPageToken));
    else {
      notify("Subscriptions fetched successfully");
    }
  } catch (err) {
    throw new Error(err.result.error.errors[0].reason);
  }
};

const transferSubscriptions = () => {
  notify("Transferring subsciptions...");
  promises = [];
  for (let [id, name] of Object.entries(USER_DATA.oldSubscriptions)) {
    if (!(id in USER_DATA.currentSubscriptions)) {
      // New subscription
      USER_DATA.newSubscriptionsCount += 1;
      promises.push(
        new Promise((res, rej) => {
          gapi.client.youtube.subscriptions
            .insert({
              part: "snippet",
              resource: {
                snippet: {
                  resourceId: {
                    kind: "youtube#channel",
                    channelId: id,
                  },
                },
              },
            })
            .then(() => {
              res({ name });
            })
            .catch(() => {
              rej({ name });
            });
        })
      );
    } else {
      USER_DATA.alreadyInAccount[id] = name;
    }
  }
  return Promise.allSettled(promises);
};

signinOldAccount.onclick = async () => {
  try {
    await authenticate();
    await loadClient();
    signinOldAccount.remove();
    await getSubscriptions("old");
    notify(
      "Old subscriptions fetched successfully. Please sign in with your new account"
    );
    let content = `| ${
      Object.keys(USER_DATA.oldSubscriptions).length
    } subscriptions |`;
    oldData.textContent = content;
    signinNewAccount.classList.remove("d-none");
  } catch (err) {
    notify(err.message);
  }
};

signinNewAccount.onclick = async () => {
  try {
    await authenticate();
    await loadClient();
    signinNewAccount.remove();
    notify("Signed in with new account");
    await getSubscriptions("current");
    notify("Current subscriptions fetched successfully!");
    transfer.classList.remove("d-none");
  } catch (err) {
    notify(err.message);
  }
};

const addSubscriptionToDom = (name, el) => {
  let li = document.createElement("li");
  li.appendChild(document.createTextNode(name));
  li.classList.add("list-group-item");
  el.appendChild(li);
};

transfer.onclick = async () => {
  try {
    const successSubs = [];
    const failedSubs = [];
    const results = await transferSubscriptions();
    console.log(results);
    results.forEach((result) => {
      if (result.status == "fulfilled") {
        successSubs.push(result.value.name);
      } else {
        failedSubs.push(result.reason.name);
      }
    });
    if (successSubs.length === USER_DATA.newSubscriptionsCount)
      notify(
        `${successSubs.length}/${
          USER_DATA.newSubscriptionsCount
        } new subscriptions transferred successfully! ${
          Object.keys(USER_DATA.oldSubscriptions).length -
          USER_DATA.newSubscriptionsCount
        } subscriptions are already in your account.`
      );
    else
      notify(
        `${successSubs.length}/${USER_DATA.newSubscriptionsCount} new subscriptions transferred. You may have exhausted the quota. Please try remaining tomorrow`
      );
    stats.classList.remove("d-none");
    stats.classList.add("d-flex");
    successSubs.forEach((el) => addSubscriptionToDom(el, completed));
    failedSubs.forEach((el) => addSubscriptionToDom(el, remaining));
    Object.values(USER_DATA.alreadyInAccount).forEach((el) =>
      addSubscriptionToDom(el, already)
    );
    transfer.remove();
  } catch (err) {
    notify(err.message);
  }
};
