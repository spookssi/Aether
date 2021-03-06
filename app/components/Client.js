import React, { Component, PropTypes } from 'react';
import { Link } from 'react-router';
import styles from './Client.css';
import sidebarStyles from './Sidebar.css';
import NetworkTab from './client/network_bar/NetworkTab.js';
import ChatBox from './client/ChatBox.js';
import UserBar from './client/user_bar/UserBar.js';

class Client extends Component {
  static propTypes = {
    networks: PropTypes.array.isRequired,
    feeds: PropTypes.object.isRequired
  };

  componentWillMount() {
    if (Object.keys(this.props.clients).length === 0) {
      this.props.networks.forEach(network => {
        this.props.create_network_tab(`${network.host}:${network.port}`);
        this.props.connect(network.host, network.port, network.ssl, network.nick, network.ident, network.real,
          network.password, network.sasl, network.invalid, network.default_channels);
      });
    }
  }

  render() {
    const { networks, network_states, feeds, users, channels, current_channel,
            change_current_channel, send_part_channel, fold_network_tab,
            expand_network_tab, counter, remove_channel, droppedFile,
            joinPrivmsg }
            = this.props;

    const actionHandlers = {
      ME: (message, channel) => this.props.send_action(channel.name, message.slice(1).join(' '), channel.network_id),
      MSG: (message, channel) => this.props.send_privmsg(message[1], message.slice(2).join(' '), channel.network_id),
      CTCP: (message, channel) => this.props.sendCtcp(message[1], 'privmsg', message.slice(2).join(' '), channel.network_id),
      PART: (message, channel) => {
        if (message.length === 1) {
          this.props.send_part_channel(channel.name, channel.network_id);
        } else {
          for (let _channel of message.slice(1)) {
            this.props.send_part_channel(_channel.name, _channel.network_id);
          }
        }
      },
      KICK: (message, channel) => {
        if (message[1].startsWith('#')) {
          for (let user of message.slice(2)) {
            this.props.send_raw('KICK', [message[1], user], channel.network_id);
          }
        } else {
          for (let user of message.slice(1)) {
            this.props.send_raw('KICK', [channel.name, user], channel.network_id);
          }
        }
      },
      BAN: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '+b', user], channel.network_id);
        }
      },
      OP: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '+o', user], channel.network_id);
        }
      },
      DEOP: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '-o', user], channel.network_id);
        }
      },
      VOICE: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '+v', user], channel.network_id);
        }
      },
      DEVOICE: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '-v', user], channel.network_id);
        }
      },
      UNBAN: (message, channel) => {
        for (let user of message.slice(1)) {
          this.props.send_raw('MODE', [channel.name, '-b',  `${user}!*@*`], channel.network_id);
        }
      },
      MODE: (message, channel) => {
        if (message[1].startsWith('#')) {
          this.props.send_raw('MODE', message.slice(1), channel.network_id);
        } else {
          this.props.send_raw('MODE', [channel.name, ...message.slice(1)], channel.network_id);
        }
      },
      TOPIC: (message, channel) => {
        if (message[1].startsWith('#')) {
          this.props.send_raw('TOPIC', message.slice(1), channel.network_id);
        } else {
          this.props.send_raw('TOPIC', [channel.name, ...message.slice(1)], channel.network_id);
        }
      },
      QUIT: (message, channel) => {
        this.props.disconnect(channel.network_id, message.slice(1).join(' '));
      },
      DISCONNECT: (message, channel) => {
        this.props.disconnect(channel.network_id, message.slice(1).join(' '));
      },
      WHOIS: (message, channel) => {
        this.props.sendWhois(message[1], channel.network_id);
      }
    };


    const defaultHandler = (message, channel) => {
      this.props.send_raw(message[0], message.slice(1), channel.network_id)
    };

    const sendCallback = (message, channel) => {
      if (message.startsWith("//")) {
        this.props.send_privmsg(channel.name, message.slice(1),
                                channel.network_id);
      } else if (message.startsWith('/')) {
        const parts = message.slice(1).split(' ');
        const handler = actionHandlers[parts[0].toUpperCase()] || defaultHandler;
        handler(parts, channel);
      } else {
        this.props.send_privmsg(channel.name, message, channel.network_id);
      }
    };

    return (
      <div className={styles.wrapper}>
        <div className={`${sidebarStyles.sidebar} ${sidebarStyles.left} ${sidebarStyles.side_panel}`}>
          <div className={sidebarStyles.panel_header}>
            <i className="material-icons md-24">device_hub</i> Networks
            <Link to="/settings" className={sidebarStyles.button} title="Settings">
              <i className="material-icons md-24">settings</i>
            </Link>
          </div>
          {
            Object.keys(channels).filter(x => channels[x].type === 'network').map(chan => {
              const network = networks.filter(x => `${x.host}:${x.port}` === channels[chan].network_id)[0];
              if (!network) {
                return null;
              }

              const network_id = `${network.host}:${network.port}`;
              return (
                <NetworkTab
                  show={
                    network_states[network_id] == null
                    ? true
                    : network_states[network_id]
                  }
                  fold={fold_network_tab}
                  expand={expand_network_tab}
                  key={network_id}
                  host={network.host}
                  name={network.name}
                  port={network.port}
                  ssl={network.ssl}
                  viewNetwork={() => change_current_channel(network_id)}
                  joinChannel={(channel) => this.props.send_join_channel(channel, network_id)}
                  channels={
                    Object.keys(channels).map(id => {
                      if (channels[id].network_id === network_id && channels[id].type !== 'network') {
                        return {
                          type: channels[id].type,
                          name: channels[id].name,
                          id,
                          callback: () => {
                            change_current_channel(channels[id].network_id, channels[id].name);
                          },
                          close_callback: () => {
                            if (channels[id].type === 'channel') {
                              send_part_channel(channels[id].name, channels[id].network_id);
                            } else {
                              remove_channel(channels[id].name, channels[id].network_id);
                            }
                          },
                          counter: counter[`${channels[id].network_id}:${channels[id].name}`] || -1,
                          selected: current_channel === `${channels[id].network_id}:${channels[id].name}`
                        };
                      }
                      return null;
                    }).filter(x => x !== null)
                  }
                />
              );
            })
          }
        </div>
        <div className={styles.main}>
          <ChatBox
            users={users[current_channel] || []}
            messages={
              (feeds[current_channel] || []).map(x => {
                return {
                  user: x.nick,
                  text: x.text,
                  time: x.time,
                  colour: x.colour,
                  kind: x.kind,
                  id: x.id,
                  useHtml: x.useHtml
                };
              })
            }
            channel={
              channels[current_channel] || {
                topic: null,
                name: 'Connecting...'
              }
            }
            callback={
              (message) => {
                const channel = channels[current_channel];
                sendCallback(message, channel);
              }
            }
            dropCallback={
              (mime, file, contents) => {
                if (channels.hasOwnProperty(current_channel)) {
                  droppedFile(mime, file, contents,
                               channels[current_channel].name,
                               channels[current_channel].network_id);
                }
              }
            }
            dropProgress={this.props.dropProgress}
            searching={this.props.searching}
            searchText={this.props.searchText}
            beginSearch={this.props.beginSearch}
            searchCallback={this.props.setSearchText}
            endSearchCallback={this.props.endSearch}
            whoisData={
              current_channel && channels[current_channel] ?
              this.props.whoisData[channels[current_channel].network_id] :
              {}
            }
          />
        </div>
        <UserBar
          users={users[current_channel]}
          joinChannel={(nick) => {
            const networkId = channels[current_channel].network_id;
            joinPrivmsg(nick, networkId);
            change_current_channel(networkId, nick);
          }}
          sendWhois={(nick) => this.props.sendWhois(nick, channels[current_channel].network_id)}
        />
      </div>
    );
  }
}

export default Client;
