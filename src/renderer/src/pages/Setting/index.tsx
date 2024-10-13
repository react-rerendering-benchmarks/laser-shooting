import { memo } from "react";
import { Autocomplete, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import colors from '@renderer/const/color';
import useCamera from '@renderer/queries/cameraQuery';
import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { RocketLaunch } from '@mui/icons-material';
import { useToggle, useUpdateEffect } from 'usehooks-ts';
import { NumberInput } from '@mantine/core';
const FPS = 60;
export default memo(function Setting() {
  console.log(window.globalCount++);
  const [open, _toggleOpen, setOpen] = useToggle(false);
  const {
    data,
    isLoading
  } = useCamera();
  const [device, setDevice] = useState<MediaDeviceInfo | undefined>(undefined);
  const [started, toggleStart, setStart] = useToggle(false);
  const [calib, toggleCalib] = useToggle(true); //
  const webCamRef = useRef<Webcam>(null);
  const showRef = useRef<HTMLCanvasElement>(null);
  const [zAngle, setZAngle] = useState(0);
  // const _laserPoint = useRef([0, 0])
  const [form, setForm] = useState({
    distance: 25,
    size: 50
  });
  useUpdateEffect(() => {
    if ((data || [])[0]) {
      if (!data?.some(_device => _device.deviceId === device?.deviceId)) {
        setDevice((data || [])[0]);
      }
    }
  }, [data]);
  useEffect(() => {
    /**
     * @function getFrameFromWebCam
     * Lấy khung hình cần được căn chỉnh lúc căn chỉnh (có vòng tròn đưa vào webcam)
     */
    async function getFrameFromWebCam() {
      const imageBase64 = webCamRef.current?.getScreenshot();
      if (imageBase64) {
        const result = (await window.electron.ipcRenderer.invoke('app.calib', {
          imageBase64,
          zAngle
        })) as string;
        const image = new Image();
        image.onload = () => {
          const context = showRef.current?.getContext('2d');
          if (context) {
            context.drawImage(image, 0, 0);
          }
        };
        image.src = `data:image/jpeg;base64,${result}`;
      }
    }
    async function getFrameFromMainProcess() {
      const imageBase64 = webCamRef.current?.getScreenshot();
      if (imageBase64) {
        const {
          result,
          detected
        } = (await window.electron.ipcRenderer.invoke('app.detect', {
          imageBase64,
          distance: form.distance,
          size: form.size,
          // range: {
          //   lower: [170, 100, 200],
          //   upper: [180, 255, 255]
          // }
          range: {
            lower: [173, 75, 75],
            upper: [173, 255, 255]
          },
          zAngle
        })) as {
          result: string;
          detected: boolean;
        };
        const image = new Image();
        image.onload = () => {
          const context = showRef.current?.getContext('2d');
          if (context) {
            context.drawImage(image, 0, 0);
          }
        };
        image.src = `data:image/jpeg;base64,${result}`;
        return detected;
      }
      return false;
    }
    if (calib) {
      let handle = 0;
      let timeout: NodeJS.Timeout | undefined = undefined;
      const nextTick = () => {
        handle = requestAnimationFrame(async () => {
          const begin = Date.now();
          await getFrameFromWebCam();
          timeout = setTimeout(() => {
            if (handle >= 0) {
              nextTick();
            }
          }, 1000 / FPS - (Date.now() - begin));
        });
      };
      nextTick();
      return () => {
        cancelAnimationFrame(handle);
        clearTimeout(timeout);
        handle = -1;
      };
    } else {
      if (started) {
        let handle = 0;
        let timeout: NodeJS.Timeout | undefined = undefined;
        const nextTick = () => {
          handle = requestAnimationFrame(async () => {
            const begin = Date.now();
            getFrameFromMainProcess();
            if (!(await getFrameFromMainProcess())) {
              timeout = setTimeout(() => {
                if (handle >= 0) {
                  nextTick();
                }
              }, 1000 / FPS - (Date.now() - begin));
            } else {
              setStart(false);
            }
          });
        };
        nextTick();
        return () => {
          cancelAnimationFrame(handle);
          clearTimeout(timeout);
          handle = -1;
        };
      }
    }
  }, [started, calib, zAngle]);
  return <Paper sx={{
    width: '1280px',
    height: '480px'
  }} elevation={4}>
      <Stack height={'480px'} width="100%" direction={'row'}>
        <Box height={'480px'} width="640px" bgcolor={colors.slate[900]} display="flex" justifyContent={'center'} alignItems="center">
          {isLoading ? <CircularProgress /> : <>
              <Webcam mirrored screenshotFormat="image/jpeg" videoConstraints={{
            deviceId: device?.deviceId
          }} height={'480px'} width={'640px'} ref={webCamRef} style={{
            position: 'absolute',
            zIndex: -1
          }} />
              <canvas ref={showRef} height={'480px'} width={'640px'} style={{
            zIndex: 1
          }} />
            </>}
        </Box>
        <Stack width={640} paddingLeft="32px" paddingRight="16px" spacing={2}>
          <Stack justifyContent={'flex-end'} alignItems="center" width="100%" direction={'row'} height="64px">
            {/* <Close /> */}
          </Stack>
          <Stack spacing={3} paddingRight="36px">
            <Autocomplete open={open} onClose={() => setOpen(false)} onBlur={() => setOpen(false)} onOpen={() => {
            setOpen(true);
          }} options={data || []} getOptionLabel={option => {
            return option.label;
          }} isOptionEqualToValue={(opts, vl) => {
            return opts.deviceId === vl.deviceId;
          }} value={device || {
            deviceId: '',
            groupId: '',
            kind: 'videoinput',
            label: '',
            toJSON: () => ''
          }} onChange={(_event, deviceData) => {
            if (deviceData) {
              setDevice(deviceData);
            }
          }} renderInput={params => {
            console.log(window.globalCount++);
            return <TextField {...params} label="Chọn thiết bị" />;
          }} loading={isLoading} disableClearable disabled={started} />
            <Stack direction={'row'} spacing={3}>
              <TextField label="Khoảng cách bắn (m)" type={'number'} value={form.distance} onChange={ev => {
              setForm(form => ({
                ...form,
                distance: Number(ev.target.value)
              }));
            }} select fullWidth disabled={started}>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={25}>25</MenuItem>
              </TextField>

              {/* <TextField
                label="Kích cỡ bia (cm)"
                type={"number"}
                value={form.size}
                onChange={(ev) => {
                  setForm((form) => ({
                    ...form,
                    size: Number(ev.target.value),
                  }));
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Help />
                    </InputAdornment>
                  ),
                }}
               /> */}
            </Stack>
            <NumberInput label="Góc nghiêng camera so với mặt phẳng ngang" value={zAngle} onChange={value => {
            if (typeof value === 'number') {
              setZAngle(value);
            }
          }} disabled={started} />
          </Stack>
          <Stack height={'100%'} width="100%" justifyContent={'flex-end'} alignItems="end" paddingBottom="32px" paddingRight="36px" direction={'row'} spacing={3}>
            <Button variant="contained" sx={{
            width: '120px',
            padding: '8px'
          }} disableRipple endIcon={<RocketLaunch />} onClick={() => {
            toggleCalib();
          }} color={calib ? 'error' : 'warning'} disabled={started}>
              <Typography variant="subtitle2">{calib ? 'Hoàn tất' : 'Căn chỉnh'}</Typography>
            </Button>
            <Button variant="contained" sx={{
            width: '120px',
            padding: '8px'
          }} disableRipple endIcon={<RocketLaunch />} onClick={() => {
            toggleStart();
          }} color={started ? 'error' : 'info'} disabled={calib}>
              <Typography variant="subtitle2">{started ? 'Stop' : 'Start'}</Typography>
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>;
});
declare global {
  interface Window {
    globalCount: number;
  }
}
window.globalCount = 0;