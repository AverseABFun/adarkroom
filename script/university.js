/**
 * Module that registers the university/skill tree functionality
 */
const University = {
  name: _('University'),
  Tree: {
    'speed': {
      name: _('speed'),
      default_locked: false,
      perks: [
        'cooldown'
      ],
      unlocks: [
        'worker_speed',
        'decreased_materials'
      ],
      cost: () => {
        return {
          wood: 1000,
          iron: 5
        }
      },
      learnMsg: _("so it begins. cooldowns decreased by 10%.")
    },
    'worker_speed': {
      name: _('worker&nbsp;speed'),
      default_locked: true,
      perks: [
        'worker_speed'
      ],
      unlocks: [],
      cost: () => {
        return {
          wood: 1500,
          iron: 10,
          coal: 20
        }
      },
      learnMsg: _("all of your workers are temporarily enrolled in the university. worker speed increased by 10%")
    },
    'decreased_materials': {
      name: _('decreased&nbsp;materials&nbsp;necessary'),
      default_locked: true,
      perks: [
        'decreased_materials'
      ],
      unlocks: [],
      cost: () => {
        return {
          wood: 1500,
          iron: 15,
          coal: 30
        }
      },
      learnMsg: Engine.Perks.decreased_materials.notify
    }
  },
  init: function() {
    if (!$SM.get('features.location.university')) {
      $SM.set('features.location.university', true);
    }
      
    // Create the University tab
    /// TRANSLATORS : University should be in the context of an institution of higher learning
    University.tab = Header.addLocation(_("A Bustling University"), "university", University, 'ship');
          
    // Create the University panel
    University.panel = $('<div>').attr('id', "universityPanel")
      .addClass('location');
    if (Fabricator.panel) {
      University.panel.insertBefore(Fabricator.panel);
    }
    else {
      University.panel.appendTo('div#locationSlider');
    }
      
    $.Dispatch('stateUpdate').subscribe(() => {
      University.updateTreeButtons();
    });
          
    Engine.updateSlider();
    University.updateTreeButtons();
  },
  onArrival: transition_diff => {
    University.setTitle();
    University.updateTreeButtons();
  
    if(!$SM.get('game.university.seen')) {
      Notifications.notify(University, _('a constant feeling of hustle and bustle. no one stops for anything except their next class.'));
      $SM.set('game.university.seen', true);
    }
    AudioEngine.playBackgroundMusic(AudioLibrary.MUSIC_RAUCOUS_VILLAGE); // not sure how well this works, new music might be necessary
  
    Engine.moveStoresView(null, transition_diff);
  },
  setTitle: () => {
    if(Engine.activeModule == University) {
      document.title = _("A Bustling University");
    }
  },
  updateTreeButtons: () => {
    let section = $('#skillTreeButtons');
    let needsAppend = false;
    if (section.length === 0) {
      section = $('<div>').attr({ 'id': 'skillTreeButtons', 'data-legend': _('skill_tree:') }).css('opacity', 0);
      needsAppend = true;
    }
    let treeUnlocked = $SM.get("skillTree.unlocked")
    if (!treeUnlocked) {
      treeUnlocked = $SM.createState("skillTree.unlocked", [])
    }

    for (const [ key, value ] of Object.entries(University.Tree)) {
      if (value.default_locked && !treeUnlocked.includes(key)) {
        continue
      }
      const max = $SM.hasPerk();
      if (!value.button) {
        const name = _(value.name) + ((value.quantity ?? 1) > 1 ? ` (x${value.quantity})` : '');
        value.button = new Button.Button({
          id: 'learn_' + key,
          cost: value.cost(),
          text: name,
          click: Fabricator.learn,
          width: '150px',
          ttPos: section.children().length > 10 ? 'top right' : 'bottom right'
        }).css('opacity', 0).attr('learnThing', key).appendTo(section).animate({ opacity: 1 }, 300, 'linear');
      } else {
        // refresh the tooltip
        const costTooltip = $('.tooltip', value.button);
        costTooltip.empty();
        const cost = value.cost();
        for (const [ resource, num ] of Object.entries(cost)) {
          $("<div>").addClass('row_key').text(_(resource)).appendTo(costTooltip);
          $("<div>").addClass('row_val').text(num).appendTo(costTooltip);
        }
        if (max && value.maxMsg && !value.button.hasClass('disabled')) {
          Notifications.notify(University, value.maxMsg);
        }
      }
      if (max) {
        Button.setDisabled(value.button, true);
      } else {
        Button.setDisabled(value.button, false);
      }
    }

    if (needsAppend && section.children().length > 0) {
      section.appendTo(University.panel).animate({ opacity: 1 }, 300, 'linear');
    }
  },
  learn: button => {
    const thing = $(button).attr('learnThing');
    const skill = University.Tree[thing];

    let gottenSkills = $SM.get("skillTree.gotten")
    if (!gottenSkills) {
      gottenSkills = $SM.createState("skillTree.gotten", [])
    }

    if (gottenSkills.includes(thing)) {
      $(button).prop("disabled",true);
      return;
    }

    const storeMod = {};
    const cost = skill.cost();
    for (const [ key, value ] of Object.entries(cost)) {
      const have = $SM.get(`stores['${key}']`, true);
      if (have < value) {
        Notifications.notify(University, _(`not enough ${key}`));
        return false;
      } else {
        storeMod[key] = have - value;
      }
    }
    gottenSkills.push(thing);
    $SM.setM('stores', storeMod);
    $SM.set(`skillTree.gotten`, gottenSkills);
    for (var item of skill.perks) {
      $SM.addPerk(item)
    }

    let treeUnlocked = $SM.get("skillTree.unlocked")
    if (!treeUnlocked) {
      treeUnlocked = $SM.createState("skillTree.unlocked", [])
    }
    for (var item of skill.unlocks) {
      treeUnlocked.push(item);
    }
    $SM.set("skillTree.unlocked", treeUnlocked)

    Notifications.notify(University, skill.learnMsg);
    AudioEngine.playSound(AudioLibrary.CRAFT); // yet again, probably need a better sound
  }
};