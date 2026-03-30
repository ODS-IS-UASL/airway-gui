import { ref } from 'vue'
import mqtt from 'mqtt'

// グローバルで共有したいステート
const status = ref('未接続')
const subscribeTopicName = ref<string | string[]>('+')//デフォルトはすべて取得
const topicName = ref('');
const latestMessage = ref('');
const username = ref('admin');
let password = ref('admin');

// MQTT 接続先
const mqttUrl = ref('');

// 接続オプション
const options = {
  clientId: 'vite-ssr-mqtt-client-' + Math.random().toString(16).slice(2),
  username: username.value,
  password: password.value,
  keepalive: 30,
  reconnectPeriod: 1000, // 切断された場合の再接続間隔(ms)
}

// MQTTクライアントインスタンス用の変数
let client: mqtt.MqttClient | null = null

// 接続処理
function connectMqtt(topic?: string | string[]) {
    const getBrokerURL = async () => {
      const url = useRuntimeConfig().public.mqttBrokerApiBaseDomain;
      mqttUrl.value = url;
    }
    getBrokerURL()
    console.log(mqttUrl.value)
    if(topic){
        subscribeTopicName.value = topic;
    }
  // 既に接続済みなら何もしない
  if (client) {
    console.log('既に接続されています')
    return client
  }

  // 接続開始
  client = mqtt.connect(mqttUrl.value, options)

  client.on('connect', () => {
    status.value = '接続中'
    console.log('MQTT 接続成功')

    // トピックをサブスクライブ
    client?.subscribe(subscribeTopicName.value, (err) => {
      if (err) {
        console.error('サブスクライブエラー:', err)
      } else {
        console.log('サブスクライブ完了:', subscribeTopicName.value)
      }
    })
  })

  client.on('reconnect', () => {
    status.value = '再接続中...'
    console.log('MQTT再接続中')
  })

  client.on('close', () => {
    status.value = '切断されました'
    console.log('MQTT切断')
    // ここで null にしておけば再度 connectMqtt() で接続し直せる
    client = null
  })

  client.on('error', (err) => {
    status.value = 'エラー'
    console.error('MQTTエラー:', err)
  })

  client.on('message', (topic, payload) => {
    console.log(`受信: topic=${topic} payload=${payload}`)
    latestMessage.value = payload.toString()
    topicName.value = topic.toString()
    console.log(topicName.value)
  })

  return client
}

// パブリッシュ用
function publishMessage(topic: string, message: string) {
  if (!client) {
    console.warn('まだMQTTに接続されていません')
    return
  }
  client.publish(topic, message)
}

export function useMqtt() {
  return {
    status,
    subscribeTopicName,
    latestMessage,
    topicName,
    connectMqtt,
    publishMessage,
  }
}
