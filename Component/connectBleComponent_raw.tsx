import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
  FlatList,
  TouchableHighlight,
  Pressable,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import axios from 'axios';
import {useNavigation} from '@react-navigation/native';
import {Buffer} from 'buffer';
import dayjs from 'dayjs';

const SECONDS_TO_SCAN_FOR = 7;
const SERVICE_UUIDS: string[] = [];
const windowWidth = Dimensions.get('window').width;
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// const CHARACTERISTIC_UUID_RX = '6e400002-b5a3-f393-e0A9-e50e24dcca9e';
const characteristicUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC_UUID_RX = '6e400002-b5a3-f393-e0A9-e50e24dcca9e';
// const CHARACTERISTIC_UUID_RX = '2A37';
const CHARACTERISTIC_UUID_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const targetDeviceName = 'Zephy46';
const ALLOW_DUPLICATES = true;
const convertToAscii = (numbers: number[]): string => {
  const asciiChars: string[] = numbers.map(number =>
    String.fromCharCode(number),
  );
  const asciiString: string = asciiChars.join('');
  return asciiString;
};
import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from 'react-native-ble-manager';
import HomeComponent from './home';
import {parse} from 'react-native-svg';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message:
          'App needs access to your location for Bluetooth functionality.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Location permission granted');
      // 위치 권한이 부여되었습니다. BLE 작업을 계속할 수 있습니다.
    } else {
      console.log('Location permission denied');
      // 위치 권한이 거부되었습니다. 적절한 처리를 해야 합니다.
    }
  } catch (err) {
    console.warn(err);
  }
}

declare module 'react-native-ble-manager' {
  interface Peripheral {
    connected?: boolean;
    connecting?: boolean;
  }
}

const ConnectBleComponentRaw = ({route}) => {
  const navigation = useNavigation();
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral['id'], Peripheral>(),
  );
  // const [rawDatas, setRawDatas] = useState(initialAsciiString);
  const [rawDatas, setRawDatas] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [connectedDeviceId, setConnectedDeviceId] = useState('');
  const [factor, setFactor] = useState(0);
  const [PPG, setPPG] = useState(0);
  const [cnt, setCnt] = useState(0);
  const [pulse, setPulse] = useState(0);

  const [ir, setIr] = useState(0);
  const [red, setRed] = useState(0);
  const [temp, setTemp] = useState(0);

  const [irData, setIrData] = useState(0);
  const [redData, setRedData] = useState(0);
  const [hrData, setHrData] = useState(0);
  const [spo2Data, setSpo2Data] = useState(0);
  const [tempData, setTempData] = useState(0);

  // <HomeComponent bleData={rawDatas} />;

  peripherals.get;

  const addOrUpdatePeripheral = (id: string, updatedPeripheral: Peripheral) => {
    // new Map() enables changing the reference & refreshing UI.
    // TOFIX not efficient.
    setPeripherals(map => new Map(map.set(id, updatedPeripheral)));
  };

  const startScan = () => {
    if (!isScanning) {
      // reset found peripherals before scan
      setPeripherals(new Map<Peripheral['id'], Peripheral>());
      try {
        console.debug('[startScan] starting scan...');
        setIsScanning(true);
        // BleManager.scan(SERVICE_UUIDS, SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
        BleManager.scan([], SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
          matchMode: BleScanMatchMode.Sticky,
          scanMode: BleScanMode.LowLatency,
          callbackType: BleScanCallbackType.AllMatches,
        })
          .then(() => {
            console.debug('[startScan] scan promise returned successfully.');
          })
          .catch(err => {
            console.error('[startScan] ble scan returned in error', err);
          });
      } catch (error) {
        console.error('[startScan] ble scan error thrown', error);
      }
    }
  };

  const handleStopScan = () => {
    setIsScanning(false);
    console.debug('[handleStopScan] scan is stopped.');
  };

  const handleDisconnectedPeripheral = (
    event: BleDisconnectPeripheralEvent,
  ) => {
    let peripheral = peripherals.get(event.peripheral);
    if (peripheral) {
      console.debug(
        `[handleDisconnectedPeripheral][${peripheral.id}] previously connected peripheral is disconnected.`,
        event.peripheral,
      );
      addOrUpdatePeripheral(peripheral.id, {...peripheral, connected: false});
    }
    console.debug(
      `[handleDisconnectedPeripheral][${event.peripheral}] disconnected.`,
    );
    // setRawDatas(0);
  };
  const [currentTime, setCurrentTime] = useState('');
  const formatDateTime = (date: Date): string => {
    const updatedDate = new Date(date);
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    return updatedDate.toLocaleString('ko-KR', options);
  };
  const checkCurrentTime = () => {
    const formattedTime = formatDateTime(new Date());
    return formattedTime;
  };
  const [dataStorage, setDataStorage] = useState<
    {time: string; ir: number; red: number}[]
  >([]);

  const [sendDatas, setSendDatas] = useState([]);
  const parseData = (
    input: string,
  ): {
    time: string | null;
    red: number | null;
    ir: number | null;
    SpO2: number | null;
    HR: number | null;
    TEMP: number | null;
  } => {
    // 초기 객체 생성, TEMP 필드를 null로 설정
    let data = {
      time: null as string | null,
      red: null as number | null,
      ir: null as number | null,
      SpO2: null as number | null,
      HR: null as number | null,
      TEMP: null as number | null,
    };

    // 문자열에서 'TEMP'가 있는지 확인
    const hasTemp = input.includes('TEMP');

    // 정규 표현식으로 숫자 값 추출
    const regex =
      /time\s*:\s*(\d+),\s*red\s*:\s*(\d+),\s*ir\s*:\s*(\d+),\s*SpO2\s*:\s*(-?\d+),\s*HR\s*:\s*(\d+)(?:,\s*TEMP\s*:\s*([\d.]+))?/;
    const match = input.match(regex);

    if (match) {
      // data.time = parseInt(match[1]);
      data.time = dayjs().format('MMDD-HH:mm:ss');
      data.red = parseInt(match[2]);
      data.ir = parseInt(match[3]);
      data.SpO2 = parseInt(match[4]);
      data.HR = parseInt(match[5]);
      // console.log('data.time : ', data.time);
      // console.log('data.red : ', data.red);
      // console.log('data.ir : ', data.ir);
      // console.log('data.SpO2 : ', data.SpO2);
      // console.log('data.HR : ', data.HR);
      setIrData(data.ir);
      setRedData(data.red);
      setHrData(data.HR);
      setSpo2Data(data.SpO2);
      // TEMP가 있으면 TEMP 필드에 값을 설정, 없으면 null 유지
      if (hasTemp) {
        data.TEMP = parseFloat(match[6]);
        setTempData(data.TEMP);
      }

      setSendDatas(prevData => [
        ...prevData,
        {
          red: data.red,
          ir: data.ir,
          SpO2: data.SpO2,
          HR: data.HR,
          TEMP: data.TEMP,
          time: data.time,
        },
      ]);
    }

    return data;
  };

  const sendArray = async () => {
    try {
      // const apiUrl = 'http://10.0.2.2:3000/receive/arrs';

      const apiUrl = 'http://211.188.52.135:3000/receive/arrs';

      // const apiUrl = 'http://211.36.133.139:3000/receive/arrs';

      // const apiUrl = 'http://localhost:3000/receive/arrs';
      // const apiUrl = 'http://27.96.128.206:3000/receive/arrs';
      // const apiUrl = 'http://localhost:3000/receive/arrs';
      // console.log('sended dataLists : ', dataLists);
      const response = await axios.post(apiUrl, sendDatas);
      if (response.status === 200) {
        Alert.alert('Success Message', 'send datas');
        setSendDatas([]);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleUpdateValueForCharacteristic = (
    data: BleManagerDidUpdateValueForCharacteristicEvent,
  ) => {
    const {value} = data;

    // Base64로 인코딩된 값을 디코딩
    const decodedValue = Buffer.from(value, 'base64').toString('utf-8');

    // console.log('value : ', decodedValue);
    const parsedData = parseData(decodedValue);
    console.log('Parsed Data: ', parsedData);

    // console.log('AAAA');
    // const {value, characteristic} = data;
    // console.log('value : ', value);
    // console.log('characteristic : ', characteristic);

    // const decodedData = Buffer.from(value, 'base64').toString();

    // console.log(`Received data from characteristic ${characteristic}:`, decodedData);
    // console.log('수신된 원시 데이터 : ', value);
    // const asciiResult: string = convertToAscii2(data.value);
    // console.log('asciiResult : ', asciiResult); // 변환된 ASCII 데이터 로그
    // const parsedData = parseData(asciiResult);
    // console.log('파싱된 데이터:', parsedData);
    // console.log('data.value : ', data.value);
    // const asciiResult: string = convertToAscii(data.value);
    // console.log('asciiResult : ', asciiResult);
    // const parts = asciiResult.split(', ');
    // const irValue = parts[0].split(': ')[1];
    // const redValue = parts[1].split(': ')[1];
    // const tempValue = parts[2] && parts[2].split(': ')[1];
    // const irNumber = parseInt(irValue);
    // const redNumber = parseInt(redValue);
    // const tempNumber = parseInt(tempValue);

    // console.log('irNumber : ', irNumber);
    // console.log('redNumber : ', redNumber);
    // console.log('tempNumber : ', tempNumber);
    // setIr(irNumber);
    // setRed(redNumber);
    // setTemp(tempNumber);
    // setDataStorage(prevData => [
    //   ...prevData,
    //   {
    //     time: checkCurrentTime().toLocaleString(),
    //     ir: irNumber,
    //     red: redNumber,
    //     temp: tempNumber,
    //   },
    // ]);
  };
  const sendObject = async () => {
    // const apiUrl = 'http://10.0.2.2:8001/object';
    // const apiUrl = 'http://localhost:8001/object';
    // const apiUrl = 'http://27.96.128.206:8001/object';
    const apiUrl = 'http://115.85.183.166:8001/objectRaw';
    try {
      const response = await axios.post(apiUrl, dataStorage);
      console.log('Data sent successfully');
      if (response.status === 200) {
        Alert.alert('Success Message', 'send success');
        setDataStorage([]);
      }
    } catch (error) {
      console.error('Error sending data:', error);
      if (error.response) {
        // 서버로부터 응답을 받았으나, 응답 코드가 2xx가 아닌 경우
        Alert.alert(
          'Error',
          `Server responded with status ${error.response.status}`,
        );
      } else if (error.request) {
        // 요청을 보냈지만 응답을 받지 못한 경우
        Alert.alert('Error', 'No response received from the server');
      } else {
        // 오류를 발생시킨 요청 자체에 문제가 있는 경우
        Alert.alert('Error', 'Request failed:', error.message);
      }
    }
  };

  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    // if (peripheral.name === targetDeviceName) {
    //   addOrUpdatePeripheral(peripheral.id, peripheral);
    // }
    if (
      peripheral.name === 'Zephy45' ||
      peripheral.advertising.localName === 'Zephy45'
    ) {
      // console.log('Zephy45 발견:', peripheral);
      addOrUpdatePeripheral(peripheral.id, peripheral); // Zephy45만 추가
    }
  };

  const togglePeripheralConnection = async (peripheral: Peripheral) => {
    if (peripheral && peripheral.connected) {
      try {
        // await BleManager.disconnect(peripheral.id);
        console.log('연결되었습니다.');
      } catch (error) {
        console.error(
          `[togglePeripheralConnection][${peripheral.id}] error when trying to disconnect device.`,
          error,
        );
      }
    } else {
      await connectPeripheral(peripheral);
      // await connectToDevice(peripheral);
    }
  };

  const connectPeripheral = async (peripheral: Peripheral) => {
    try {
      if (peripheral) {
        // console.log('peripheral : ', peripheral);
        console.log('연결된 device의 peripheral.id : ', peripheral.id);
        // console.log(
        //   '연결된 device의 peripheral.id의 타입 : ',
        //   typeof peripheral.id,
        // );
        addOrUpdatePeripheral(peripheral.id, {...peripheral, connecting: true});

        await BleManager.connect(peripheral.id);
        console.debug(`[connectPeripheral][${peripheral.id}] connected.`);

        addOrUpdatePeripheral(peripheral.id, {
          ...peripheral,
          connecting: false,
          connected: true,
        });

        await BleManager.checkState().then(state =>
          console.log(`current BLE state = '${state}'.`),
        );

        // 서비스 및 characteristic 가져오기
        const peripheralData = await BleManager.retrieveServices(peripheral.id);
        console.debug(
          `[connectPeripheral][${peripheral.id}] retrieved peripheral services`,
          peripheralData,
        );

        const characteristics = peripheralData.characteristics;
        characteristics?.forEach(async characteristic => {
          const {characteristic: char, properties} = characteristic;
          console.log(`Characteristic ${char} properties:`, properties);
        });
        await BleManager.checkState().then(state =>
          console.log(`current BLE state = '${state}'.`),
        );
        const sUUID = 'a3c87500-8ed3-4bdf-8a39-a01bebede295';
        const cUUID = 'a3c87502-8ed3-4bdf-8a39-a01bebede295';
        await BleManager.startNotification(
          peripheral.id,
          sUUID,
          cUUID,
          // '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
          // '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
          // '0x2A38',
          // '0x2A38',
        )
          .then(() => {
            // Success code
            console.log('Notification started on characteristic:', cUUID);
          })
          .catch(error => {
            // Failure code
            console.log('1111에러는 : ', error);
          });

        // RSSI 읽기
        const rssi = await BleManager.readRSSI(peripheral.id);
        console.debug(
          `[connectPeripheral][${peripheral.id}] retrieved current RSSI value: ${rssi}.`,
        );

        let p = peripherals.get(peripheral.id);
        if (p) {
          addOrUpdatePeripheral(peripheral.id, {...peripheral, rssi});
        }

        setConnectedDeviceId(peripheral.id);

        return () => {};
      }
    } catch (error) {
      console.error(
        `[connectPeripheral][${peripheral.id}] connectPeripheral error`,
        error,
      );
      console.log('연결에 실패했다.');
    }
  };

  function sleep(ms: number) {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
  useEffect(() => {
    try {
      BleManager.start({showAlert: false})
        .then(() => {
          console.debug('BleManager started.');
          requestLocationPermission();
        })
        .catch(error =>
          console.error('BeManager could not be started.', error),
        );
    } catch (error) {
      console.error('unexpected error starting BleManager.', error);
      return;
    }

    const listeners = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral,
      ),
      // bleManagerEmitter.addListener(
      //   'BleManagerDiscoverPeripheral',
      //   peripheral => {
      //     console.log('Discovered peripheral:', peripheral);
      //   },
      // ),
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan),
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        handleDisconnectedPeripheral,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        handleUpdateValueForCharacteristic,
      ),
      bleManagerEmitter.addListener(
        'BleManagerConnectPeripheral',
        peripheral => {
          const isConnected = peripheral.connected;
          console.log('연결 상태 변경:', isConnected);

          // 연결 상태를 상태에 업데이트
          const updatedPeripheral = {
            ...peripheral,
            connected: isConnected,
          };
          addOrUpdatePeripheral(updatedPeripheral.id, updatedPeripheral);
        },
      ),
    ];

    handleAndroidPermissions();

    return () => {
      console.debug('[app] main component unmounting. Removing listeners...');
      for (const listener of listeners) {
        listener.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAndroidPermissions = () => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]).then(result => {
        if (result) {
          console.debug(
            '[handleAndroidPermissions] User accepts runtime permissions android 12+',
          );
        } else {
          console.error(
            '[handleAndroidPermissions] User refuses runtime permissions android 12+',
          );
        }
      });
    } else if (Platform.OS === 'android' && Platform.Version >= 23) {
      PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(checkResult => {
        if (checkResult) {
          console.debug(
            '[handleAndroidPermissions] runtime permission Android <12 already OK',
          );
        } else {
          PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ).then(requestResult => {
            if (requestResult) {
              console.debug(
                '[handleAndroidPermissions] User accepts runtime permission android <12',
              );
            } else {
              console.error(
                '[handleAndroidPermissions] User refuses runtime permission android <12',
              );
            }
          });
        }
      });
    }
  };

  const renderItem = ({item}: {item: Peripheral}) => {
    // if (item.id && item.id.includes(searchDeviceId)) {
    // if (item.name && item.name.includes(targetDeviceName)) {
    // if (item.name) {
    if (item.name?.includes(targetDeviceName)) {
      // console.log('item : ', item);
      return (
        <TouchableHighlight
          onPress={() => {
            togglePeripheralConnection(item);
          }}
          key={item.id}
          style={{
            ...styles.touch_box,
            // backgroundColor: item.connecting ? 'white' : 'white',
            // opacity: item.connecting ? 1 : 0.35,
          }}>
          <View style={styles.row}>
            <Image
              source={require('../assets/images/device_icon.png')}
              style={styles.icon}
            />
            {/* <Text style={styles.peripheralName}>{targetDeviceName}</Text> */}
            <Text style={styles.peripheralName}>{item.id}</Text>
            <Image
              source={
                ir === ''
                  ? require('../assets/images/connecting_img1.png')
                  : require('../assets/images/connecting_img2.png')
              }
              style={styles.connecting}
            />
            {/* <Text style={styles.state}>
    {rawDatas === '' ? '연결 안 됨' : '연결됨'}
  </Text> */}
          </View>
        </TouchableHighlight>
      );
    }
    return null;
  };

  const sendData = (data: string, connectedDeviceId: string | null) => {
    console.log('입력한 데이터는 : ', inputValue);
    if (!connectedDeviceId) {
      console.log('연결된 장치가 없습니다.');
      return;
    } else {
      console.log('연결된 장치의 deviceID : ', connectedDeviceId);
    }

    const byteArray = convertDataToByteArray(data);

    // BLE 장치로 데이터 송신
    BleManager.write(
      connectedDeviceId,
      SERVICE_UUID,
      CHARACTERISTIC_UUID_RX,
      byteArray,
    )
      .then(() => {
        // 성공적으로 데이터를 씀
        console.log('데이터를 BLE 장치로 성공적으로 보냈습니다.', data);
      })
      .catch(error => {
        // 데이터 쓰기 중 오류 발생
        console.error('데이터를 BLE 장치로 보내는 동안 오류 발생:', error);
      });
  };

  // 데이터를 바이트 배열로 변환
  const convertDataToByteArray = (data: string): number[] => {
    const byteArray: number[] = [];
    for (let i = 0; i < data.length; i++) {
      byteArray.push(data.charCodeAt(i));
    }
    return byteArray;
  };
  // const {data} = route ? route.params : null;

  return (
    <>
      <View style={styles.container}>
        {/* <Text style={styles.title}>{data.title}</Text> */}
        {/* <View style={styles.img_box}>
          <TouchableOpacity style={styles.ble_touch} onPress={startScan}>
            {isScanning ? (
              <Image
                source={require('../assets/images/bleConnect_img.png')}
                style={styles.ble_img}
              />
            ) : (
              <Image
                source={require('../assets/images/bleStart_img.png')}
                style={styles.ble_img}
              />
            )}
          </TouchableOpacity>

          <Text style={styles.ble_text}>
            Turn on the Bluetooth connection{'\n'}of the device.
          </Text>
        </View> */}
        {/* <Text style={{...styles.title, marginTop: 20}}>Device list</Text> */}
        <View style={styles.list_box}>
          <FlatList
            data={Array.from(peripherals.values())}
            contentContainerStyle={{rowGap: 12}}
            renderItem={renderItem}
            keyExtractor={item => item.id}
          />
        </View>

        <SafeAreaView style={styles.body}>
          <Pressable
            style={styles.scanButton}
            onPress={startScan}
            android_ripple={{color: 'lightgray'}}>
            <Text style={styles.scanButtonText}>
              {isScanning ? '탐색중...' : '주변 기기 탐색'}
            </Text>
          </Pressable>
          {/* <View style={styles.input_box}>
            <TextInput
              placeholder="Factor(숫자)를 입력하세요"
              placeholderTextColor={'white'}
              onChangeText={text => setInputValue(text)}
              value={inputValue}
              keyboardType="numeric"
              style={{...styles.inputText, color: 'white'}}
            />
            <Pressable
              style={{...styles.scanButton, width: '25%'}}
              // onPress={handleSendData}
              onPress={() => {
                sendData(inputValue, connectedDeviceId);
                setInputValue('');
              }}
              android_ripple={{color: 'lightgray'}}>
              <Text style={styles.scanButtonText}>전송</Text>
            </Pressable>
          </View> */}
          <SafeAreaView style={{...styles.body, marginTop: 20}}>
            <Pressable style={styles.scanButton}>
              <Text style={styles.scanButtonText}>HR : {hrData}</Text>
            </Pressable>
            <Pressable style={styles.scanButton}>
              <Text style={styles.scanButtonText}>SPO2 : {spo2Data}</Text>
            </Pressable>
            <Pressable style={styles.scanButton}>
              <Text style={styles.scanButtonText}>TEMP : {tempData}</Text>
            </Pressable>
          </SafeAreaView>
          <Pressable
            style={styles.scanButton}
            // onPress={sendObject}
            onPress={sendArray}
            android_ripple={{color: 'lightgray'}}>
            <Text style={styles.scanButtonText}>데이터 보내기</Text>
          </Pressable>
          {/* <Pressable
            style={styles.scanButton}
            onPress={() => {
              navigation.navigate('Test');
            }}
            android_ripple={{color: 'lightgray'}}>
            <Text style={styles.scanButtonText}>test server</Text>
          </Pressable> */}
          {/* <Pressable
          style={styles.scanButton}
          onPress={() => {
            setRawDatas('');
            console.log(rawDatas);
          }}
          android_ripple={{color: 'lightgray'}}>
          <Text style={styles.scanButtonText}>
            <Text style={styles.scanButtonText}>초기화</Text>
          </Text>
        </Pressable> */}
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 'auto',
    display: 'flex',
    padding: 0,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    marginTop: 40,
    marginLeft: 60,
    fontSize: 30,
    fontWeight: '700',
    color: 'white',
    textAlign: 'left',
  },
  img_box: {
    width: '100%',
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
  },
  ble_touch: {
    width: 300,
    height: 300,
    borderWidth: 1,
    borderColor: 'white',
  },
  ble_img: {
    width: 300,
    height: 300,
  },
  ble_text: {
    fontSize: 15,
    color: 'white',
    marginTop: 20,
    textAlign: 'center',
  },
  // -------------------------------------
  btn_box: {
    paddingTop: 13,
    // backgroundColor: 'white',
  },
  back_btn: {
    fontSize: 12,
    color: '#12B6D1',
    fontWeight: 'bold',
    marginLeft: 31,
  },
  body: {
    // backgroundColor: 'white',
    alignItems: 'center',
  },
  scanButton: {
    width: 207,
    // width: '100%',
    height: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12B6D1',
    marginTop: 22,
    borderRadius: 6,
  },
  input_box: {
    width: '80%',
    height: 41,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanButtonText: {
    fontSize: 20,
    color: 'white',
  },
  list_box: {
    width: '90%',
    height: '25%',
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: '#2D7C9B',
    display: 'flex',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
    marginBottom: 0,
  },

  row: {
    width: windowWidth * 0.8,
    height: 47,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 14,
    // elevation: 2,
    // backgroundColor: 'gray',
    // borderRadius: 6,
    // shadowColor: '#000000',
    // shadowOffset: {width: 1, height: 1},
    // shadowOpacity: 0.8,
    // shadowRadius: 8,
    // opacity: 0.25,
  },
  touch_box: {
    height: 47,
    marginTop: 15,
    marginBottom: 15,
  },
  icon: {
    width: 30,
    height: 30,
  },
  peripheralName: {
    width: windowWidth * 0.55,
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  connecting: {
    width: 30,
    height: 30,
  },
  state: {
    fontSize: 16,
    fontWeight: 'bold',
    // color: '#ADADAD',
    color: 'white',
  },
  inputText: {
    width: '70%',
    height: 41,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#12B6D1',
    paddingLeft: 20,
    // textAlign: 'center',
  },
});
export default ConnectBleComponentRaw;
