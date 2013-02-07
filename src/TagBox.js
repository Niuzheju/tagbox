var TagBox = function(el, opts){

  var self = this;

  self.tokens = [];

  var input = self.input = $(el)
    .hide();
  self.options = opts;

  var wrapper = self.wrapper = $('<div class="tagbox-wrapper" />')
    .click(function(e){
      var target = $(e.target).closest('input, .tagbox-token, .tagbox-wrapper');

      if(target.is('.tagbox-token')){
        if($(e.target).is('a')){
          removeToken(target.data('token'));
        }else{
          selectToken(target.data('token'));
        }
      }else{
        deselectCurrentToken();
      }
      newInput.focus();
    })
    .insertBefore(self.input);

  var thePlaceholder = input.attr('placeholder');

  var newInput = $('<input type="text" />')
    .attr({
      autocomplete: input.attr('autocomplete'),
      spellcheck: input.attr('spellcheck'),
      autocapitalize: input.attr('autocapitalize'),
      placeholder: thePlaceholder
    })
    .on('keyup keydown blur update change', resizeInputBox)
    .on('keypress', function(e){
      if(e.keyCode === 13 && newInput.val()){
        e.preventDefault();
        return false;
      }
    })
    .on('blur', function(){
      setTimeout(function(){
        if(!self.dontHide) dropdown.hide();
        wrapper.removeClass('focus');
      }, 50);
    })
    .on('keydown', handleKeyDown)
    .on('focus', function(){
      wrapper.addClass('focus');
      updateDropdown();
    })
    .appendTo(wrapper);

  var resizer = $('<span />')
    .appendTo(wrapper)
    .css({
      position: 'absolute',
      left: -100000,
      width: 'auto',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      fontSize: input.css('fontSize'),
      fontFamily: input.css('fontFamily'),
      fontWeight: input.css('fontWeight'),
      fontVariant: input.css('fontVariant'),
      letterSpacing: input.css('letterSpacing')
    });

  var dropdown = self.dropdown = new CompletionDropdown(self, opts);

  dropdown.el.appendTo(opts['dropdownContainer']);

  if(input.val()){
    var items = opts['items'];
    var bits = input.val().split(opts['delimiter']);
    var found;
    for(var i = 0; i < bits.length; i += 1){
      found = false;
      for(var j = 0; j < items.length; j += 1){
        if(items[j][opts['valueField']] == bits[i]){
          addToken(items[j]);
          found = true;
          break;
        }
      }
      if(!found && opts['allowNew']){
        addToken(opts['createNew'](bits[i]));
      }
    }
  }

  var ready = true;

  resizeInputBox(true);
  $(window).on('resize', function(){
    resizeInputBox(true);
  });


  function handleKeyDown(e){

    var cursorFarRight = (newInput.val().length == newInput[0].selectionStart);
    var cursorFarLeft = (newInput[0].selectionEnd === 0);

    var theKeyCode = e.keyCode;

    if(theKeyCode === 37){
      if(selectedToken){
        if(selectedToken === self.tokens[0]){
          deselectCurrentToken();
        }else{
          selectToken(self.tokens[self.tokens.indexOf(selectedToken) - 1]);
        }
        return false;
      }
      if(cursorFarLeft && self.tokens.length){
        selectToken(self.tokens[self.tokens.length - 1]);
      }
    }

    if(theKeyCode === 39){
      if(selectedToken){
        if(selectedToken === self.tokens[self.tokens.length - 1]){
          deselectCurrentToken();
        }else{
          selectToken(self.tokens[self.tokens.indexOf(selectedToken) + 1]);
        }
        return false;
      }
      if(cursorFarRight && self.tokens.length){
        selectToken(self.tokens[0]);
      }
    }

    if(selectedToken &&
      (theKeyCode === 46 || // delete
       theKeyCode === 8 )   // backspace
    ){
      removeToken(selectedToken, theKeyCode === 8 ? -1 : 1);
      return false;
    }

    if(theKeyCode === 8 && cursorFarLeft && self.tokens.length){
      selectToken(self.tokens[self.tokens.length - 1]);
      return false;
    }

    if(dropdown.visible){
      if(theKeyCode === 38){
        dropdown.selectPrevious();
        return false;
      }
      if(theKeyCode === 40){
        dropdown.selectNext();
        return false;
      }

      if((theKeyCode == 39 &&
            cursorFarRight) || // right, but only if we're at the furthest
          theKeyCode == 13 || // enter
    //    theKeyCode == 32 || // space
          theKeyCode == 9  ){ // tab
        var selection = dropdown.getSelected();

        if(selection){
          addToken(selection);
          return false;
        }else if(opts['allowNew']){
          addToken(opts['createNew'](newInput.val()));
          return false;
        }
      }
    }else{
      if(theKeyCode == 13// ||
     //  theKeyCode == 32 ||
     //    theKeyCode == 9
     ){
        return false;
      }
    }

    // Don't allow typing if we've hit the maximum
    if(self.tokens.length === opts['maxItems'] && !(
        e.keyCode == 9
      )){
      newInput.val('');
      return false;
    }

    //if(String.fromCharCode(e.which)){
      setTimeout(updateDropdown, 10);
    //}
  }

  function addToken(selectedItem){
    var t = new Token(selectedItem, opts);

    t.el.insertBefore(newInput);
    t.el.css('maxWidth', self.wrapper.width());

    self.tokens.push(t);

    if(ready) newInput.val('');
    resizeInputBox(true);
    dropdown.hide();

    newInput.focus();

    updateInput();
  }

  self.addToken = addToken;

  function removeToken(token, reSelect){
    token.remove();

    var idx = self.tokens.indexOf(token);

    self.tokens.splice(idx, 1);

    if(token === selectedToken) selectedToken = undefined;

    updateInput();
    resizeInputBox(true);

    if(reSelect){
      if(reSelect === -1){
        selectToken(self.tokens[idx - 1]);
      }else if(reSelect === 1){
        selectToken(self.tokens[idx]);
      }
    }

    updateDropdown();

  }

  function updateInput(){
    var values = [];
    for(var i = 0; i < self.tokens.length; i += 1){
      values.push(self.tokens[i].value);
    }

    input.val(values.join(opts['delimiter']));
  }

  var selectedToken;

  function selectToken(token){
    if(selectedToken){
      selectedToken.deselect();
    }
    if(selectedToken !== token){
      selectedToken = token;
      token.select();
    }else{
      selectedToken = undefined;
    }
  }

  function deselectCurrentToken(){
    if(selectedToken){
      selectedToken.deselect();
      selectedToken = undefined;
    }
  }

  function scoresObject(){
    var si = opts['searchIn'];
    if(typeof si == 'string'){
      si = [si];
    }
    if($.isArray(si)){
      var scores = {};
      for(var i = 0; i < si.length; i += 1){
        scores[si[i]] = 10;
      }
      return scores;
    }

    return si;
  }

  function alreadyHaveItem(item){
    for(var i = 0; i < self.tokens.length; i += 1){
      if(self.tokens[i].item === item) return true;
    }
    return false;
  }

  function updateDropdown(){
    var items = opts['items'];
    var itemsToShow = [];
    var term = newInput.val();
    var relevance = scoresObject();

    if(self.tokens.length === opts['maxItems']){
      dropdown.hide();
      newInput.removeAttr('placeholder');
      return;
    }else{
      newInput.attr('placeholder', thePlaceholder)
    }

    if(term === '' && !opts['autoShow']){
      dropdown.hide();
      return;
    }

    if(term !== ''){
      for(var i = 0; i < items.length; i += 1){
        var theItem = {
          item: items[i],
          score: fuzzyMatch(items[i], term, relevance)
        };
        if(theItem.score > 0 && (opts['allowDuplicates'] || !alreadyHaveItem(theItem.item))){
          itemsToShow.push(theItem);
        }
      }

      itemsToShow = itemsToShow.sort(function(a, b){
        return b.score - a.score;
      });

      for(var i = 0; i < itemsToShow.length; i += 1){
        itemsToShow[i] = itemsToShow[i].item;
      }
    }else{
      for(var i = 0; i < items.length; i += 1){
        if(opts['allowDuplicates'] || !alreadyHaveItem(items[i])){
          itemsToShow.push(items[i]);
        }
      }
    }

    dropdown.showItems(itemsToShow);
    dropdown.setEmptyItem(term);
    dropdown.updatePosition(wrapper);
  }

  function resizeInputBox(force){
    if(self.currentInput == newInput.val() && (force !== true)) return;

    deselectCurrentToken();

    self.currentInput = newInput.val();

    resizer.text(self.currentInput);


    newInput.width(0);

    newInput.width(
      Math.min(
        self.wrapper.width() - 16,
        Math.max(
          self.wrapper.width() - newInput.offset().left + self.wrapper.offset().left + 16,
          resizer.width(),
          1
        )
      )
    );

    dropdown.updatePosition(wrapper);
  }

};
