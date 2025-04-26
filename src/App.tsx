import './App.css'
import {Box, Button, Card, CardActions, CardContent, Divider, Stack, Typography} from "@mui/material";
import KeyboardIcon from '@mui/icons-material/Keyboard';
import JsLogoIcon from './assets/icons/js-logo.svg';
import ReactLogoIcon from './assets/icons/react-logo.svg';
import MaterialLogoIcon from './assets/icons/material-ui-logo.svg';
import Html5LogoIcon from './assets/icons/html5-logo.svg';

function App() {

    return (<>
            <Box justifyContent={"center"} mt={4}>
                <Typography component={"h1"} sx={{typography:{md:"h1", xs:"h2"}, fontFamily:"'Zain', sans-serif !important", fontWeight: "600 !important"}} justifyContent={"center"}
                            alignContent={"center"} align={"center"} fontWeight={600}>Navnit
                    Durai</Typography>
                <Typography variant={"h6"} align={"center"} mt={-2}>
                    <Typography component={"span"} variant={"subtitle2"}>(aka) </Typography>
                    Padmanavaneethan Duraiswamy
                </Typography>
            </Box>
            <Box justifyContent={"center"} mt={5}>
                <Typography fontFamily={'"Zain", san-serif'} variant={"h3"} justifyContent={"center"}
                            alignContent={"center"} align={"center"} fontWeight={600} gutterBottom>Software
                    Engineer</Typography>
            </Box>
            <Divider/>
            <Box justifyContent={"center"} mt={5}>
                <Typography fontFamily={'"Zain", san-serif'} variant={"h3"} justifyContent={"center"}
                            alignContent={"center"} align={"center"} fontWeight={600}>Projects</Typography>
            </Box>
            <Box mt={5} justifyItems={"center"}>
                <Card sx={{width: {md: '400px', sm: '100%'}}} elevation={3}>
                    <CardContent>
                        <Box display={"flex"} flexDirection={"row"}>

                            <Typography
                                variant="h6"
                                noWrap
                                component="a"
                                href="fast-fingers"
                                sx={{
                                    mr: 2,
                                    display: 'flex',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    letterSpacing: '.3rem',
                                    color: 'inherit',
                                    textDecoration: 'none',
                                }}
                                gutterBottom
                            ><KeyboardIcon sx={{display: 'flex', mr: 1, verticalAlign: "middle"}}/>
                                FASTFiNGERS
                            </Typography>
                        </Box>
                        <Typography variant={"body1"} gutterBottom>A fun and interactive typing practice game to improve your typing
                            speed
                            and accuracy. Challenge yourself with multiple levels!</Typography>

                        <Stack direction={"row"} spacing={2} mt={3}>
                            <img src={JsLogoIcon} title="Java Script" alt="JS Logo" width={32} height={32}/>
                            <img src={ReactLogoIcon} title="React" alt="React Logo" width={32} height={32}/>
                            <img src={MaterialLogoIcon} title={"Material UI"} alt="Material UI Logo" width={32} height={32}/>
                            <img src={Html5LogoIcon} title="HTML5" alt="HTML5 Logo" width={32} height={32}/>
                        </Stack>
                    </CardContent>
                    <CardActions>
                        <Box width={"100%"} display={"flex"} flexDirection={"row"} justifyContent={"right"} alignItems={"end"} alignContent={"flex-end"} justifyItems={"right"}>
                            <Button component={"a"} href={"fast-fingers"} variant={"text"}>Try it out!</Button>
                        </Box>
                    </CardActions>
                </Card>
            </Box>
        </>)
}

export default App
